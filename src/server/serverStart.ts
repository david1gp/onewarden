import { loggerCreate } from "../shared/logging/loggerCreate.js"
import { serverConfigLoad } from "./config/serverConfigLoad.js"
import { adminConfigCreate } from "./contexts/admin/adminConfigCreate.js"
import { iconCacheAdapterCreate } from "./contexts/icons/iconCacheAdapterCreate.js"
import { iconConfigLoad } from "./contexts/icons/iconConfigLoad.js"
import { identityConfigLoad } from "./contexts/identity/identityConfigLoad.js"
import { identityTokenKeyPairResolve } from "./contexts/identity/identityTokenKeyPairResolve.js"
import { notificationHubCreate } from "./contexts/notifications/notificationHubCreate.js"
import { sendFileStorageAdapterCreate } from "./contexts/sends/sendFileStorageAdapterCreate.js"
import { sendPurge } from "./contexts/sends/sendPurge.js"
import { emergencyAccessReminderRun } from "./contexts/emergencyAccess/emergencyAccessReminderRun.js"
import { emergencyAccessTimeoutRun } from "./contexts/emergencyAccess/emergencyAccessTimeoutRun.js"
import { identityMailAdapterCreate } from "./contexts/identity/identityMailAdapterCreate.js"
import { twoFactorIncompleteNotificationRun } from "./contexts/twoFactor/twoFactorIncompleteNotificationRun.js"
import { twoFactorWebAuthnU2fMigrate } from "./contexts/twoFactor/twoFactorWebAuthnU2fMigrate.js"
import { databaseClose } from "./database/databaseClose.js"
import { databaseMigrate } from "./database/databaseMigrate.js"
import { databaseOpen } from "./database/databaseOpen.js"
import { serverAppCreate } from "./serverAppCreate.js"
import { clockCreate } from "../shared/clock/clockCreate.js"

const defaultLogger = loggerCreate()
const configResult = serverConfigLoad()
if (!configResult.success) {
  defaultLogger.error("server.configuration.invalid", { errorMessage: configResult.errorMessage })
  process.exit(1)
}

const logger = loggerCreate({ level: configResult.data.LOG_LEVEL })
const iconConfigResult = iconConfigLoad()
if (!iconConfigResult.success) {
  logger.error("server.icon-configuration.invalid", { errorMessage: iconConfigResult.errorMessage })
  process.exit(1)
}
const identityConfigResult = identityConfigLoad()
if (!identityConfigResult.success) {
  logger.error("server.identity-configuration.invalid", { errorMessage: identityConfigResult.errorMessage })
  process.exit(1)
}
const databaseResult = databaseOpen(configResult.data.DATABASE_PATH)
if (!databaseResult.success) {
  logger.error("database.open-failed", { errorMessage: databaseResult.errorMessage })
  process.exit(1)
}

const database = databaseResult.data
const migrationResult = databaseMigrate(database)
if (!migrationResult.success) {
  logger.error("database.migration-failed", { errorMessage: migrationResult.errorMessage })
  const closeResult = databaseClose(database)
  if (!closeResult.success) logger.error("database.close-failed", { errorMessage: closeResult.errorMessage })
  process.exit(1)
}
const u2fMigrationResult = twoFactorWebAuthnU2fMigrate(database)
if (!u2fMigrationResult.success) {
  logger.error("two-factor.webauthn-u2f-migration-failed", { errorMessage: u2fMigrationResult.errorMessage })
  const closeResult = databaseClose(database)
  if (!closeResult.success) logger.error("database.close-failed", { errorMessage: closeResult.errorMessage })
  process.exit(1)
}

const tokenKeyPairResult = identityTokenKeyPairResolve(database)
if (!tokenKeyPairResult.success) {
  logger.error("identity.key-pair-failed", { errorMessage: tokenKeyPairResult.errorMessage })
  const closeResult = databaseClose(database)
  if (!closeResult.success) logger.error("database.close-failed", { errorMessage: closeResult.errorMessage })
  process.exit(1)
}
const tokenKeyPair = tokenKeyPairResult.data
const sendStorage = sendFileStorageAdapterCreate({ directory: configResult.data.SENDS_FOLDER })
const notificationHub = notificationHubCreate({
  enabled: configResult.data.ENABLE_WEBSOCKET,
  proxy: configResult.data.PROXY,
  publicKey: tokenKeyPair.publicKey,
  publicOrigin: configResult.data.PUBLIC_ORIGIN,
})
const serverClock = clockCreate()
const mail = identityMailAdapterCreate(serverClock)

const app = serverAppCreate({
  ciphers: {
    maxNoteSize: configResult.data.INCREASE_NOTE_SIZE_LIMIT ? 100_000 : 10_000,
  },
  clock: serverClock,
  database,
  admin: {
    config: adminConfigCreate({
      ADMIN_TOKEN: configResult.data.ADMIN_TOKEN,
      DISABLE_ADMIN_TOKEN: configResult.data.DISABLE_ADMIN_TOKEN,
      ADMIN_SESSION_LIFETIME: configResult.data.ADMIN_SESSION_LIFETIME,
      INVITATION_ORG_NAME: configResult.data.INVITATION_ORG_NAME,
    }),
    databasePath: configResult.data.DATABASE_PATH,
  },
  icons: {
    cache: iconCacheAdapterCreate({ directory: iconConfigResult.data.ICON_CACHE_FOLDER }),
    config: iconConfigResult.data,
  },
  identity: {
    config: identityConfigResult.data,
    privateKey: tokenKeyPair.privateKey,
    publicKey: tokenKeyPair.publicKey,
    publicOrigin: configResult.data.PUBLIC_ORIGIN,
    mail,
  },
  logger,
  notifications: { hub: notificationHub },
  push: {
    configuration: {
      enabled: configResult.data.PUSH_ENABLED,
      relayUri: configResult.data.PUSH_RELAY_URI,
      identityUri: configResult.data.PUSH_IDENTITY_URI,
      installationId: configResult.data.PUSH_INSTALLATION_ID,
      installationKey: configResult.data.PUSH_INSTALLATION_KEY,
    },
  },
  sends: {
    quotaBytes: configResult.data.USER_SEND_LIMIT === undefined ? undefined : configResult.data.USER_SEND_LIMIT * 1_024,
    sendsAllowed: configResult.data.SENDS_ALLOWED,
    storage: sendStorage,
  },
  web: {
    webVaultEnabled: configResult.data.WEB_VAULT_ENABLED,
    webVaultFolder: configResult.data.WEB_VAULT_FOLDER,
  },
})
try {
  const server = Bun.serve({
    fetch: async (request, bunServer) => {
      const upgradeResult = await notificationHub.upgrade(request, bunServer)
      if (upgradeResult !== undefined) return upgradeResult
      return app.fetch(request)
    },
    hostname: configResult.data.HOST,
    port: configResult.data.PORT,
    websocket: notificationHub.websocket,
  })
  logger.info("server.started", {
    host: configResult.data.HOST,
    port: configResult.data.PORT,
  })

  const purgeSends = async (): Promise<void> => {
    const result = await sendPurge(database, serverClock, sendStorage)
    if (!result.success) logger.error("send.purge-failed", { errorMessage: result.errorMessage })
  }
  const runEmergencyAccessTimeout = async (): Promise<void> => {
    const result = await emergencyAccessTimeoutRun({
      clock: serverClock,
      config: identityConfigResult.data,
      database,
      mail,
    })
    if (!result.success) logger.error("emergency-access.timeout-failed", { errorMessage: result.errorMessage })
  }
  const runEmergencyAccessReminder = async (): Promise<void> => {
    const result = await emergencyAccessReminderRun({
      clock: serverClock,
      config: identityConfigResult.data,
      database,
      mail,
    })
    if (!result.success) logger.error("emergency-access.reminder-failed", { errorMessage: result.errorMessage })
  }
  const runTwoFactorIncompleteNotification = async (): Promise<void> => {
    const result = await twoFactorIncompleteNotificationRun({
      clock: serverClock,
      config: identityConfigResult.data,
      database,
      mail,
    })
    if (!result.success)
      logger.error("two-factor.incomplete-notification-failed", { errorMessage: result.errorMessage })
  }
  const purgeInterval = setInterval(() => void purgeSends(), 60 * 60 * 1_000)
  const emergencyAccessTimeoutInterval = setInterval(() => void runEmergencyAccessTimeout(), 60 * 60 * 1_000)
  const emergencyAccessReminderInterval = setInterval(() => void runEmergencyAccessReminder(), 60 * 60 * 1_000)
  const twoFactorIncompleteNotificationInterval = setInterval(
    () => void runTwoFactorIncompleteNotification(),
    60 * 1_000,
  )
  void purgeSends()
  void runEmergencyAccessTimeout()
  void runEmergencyAccessReminder()
  void runTwoFactorIncompleteNotification()

  let shutdownPromise: Promise<void> | undefined
  const shutdown = (): Promise<void> => {
    if (shutdownPromise !== undefined) return shutdownPromise
    shutdownPromise = (async () => {
      try {
        await server.stop(true)
      } catch {
        logger.error("server.stop-failed", { error: "stop-failed" })
      }
      clearInterval(purgeInterval)
      clearInterval(emergencyAccessTimeoutInterval)
      clearInterval(emergencyAccessReminderInterval)
      clearInterval(twoFactorIncompleteNotificationInterval)
      const closeResult = databaseClose(database)
      if (!closeResult.success) logger.error("database.close-failed", { errorMessage: closeResult.errorMessage })
    })()
    return shutdownPromise
  }
  process.once("SIGINT", () => void shutdown())
  process.once("SIGTERM", () => void shutdown())
} catch {
  const closeResult = databaseClose(database)
  if (!closeResult.success) logger.error("database.close-failed", { errorMessage: closeResult.errorMessage })
  logger.error("server.start-failed", { error: "listen-failed" })
  process.exit(1)
}
