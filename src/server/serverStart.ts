import { clockCreate } from "../shared/clock/clockCreate.js"
import { loggerCreate } from "../shared/logging/loggerCreate.js"
import { serverConfigLoad } from "./config/serverConfigLoad.js"
import { adminBackupAdapterCreate } from "./contexts/admin/adminBackupAdapterCreate.js"
import { adminConfigCreate } from "./contexts/admin/adminConfigCreate.js"
import { attachmentStorageCreate } from "./contexts/attachments/attachmentStorageCreate.js"
import { iconCacheAdapterCreate } from "./contexts/icons/iconCacheAdapterCreate.js"
import { iconConfigLoad } from "./contexts/icons/iconConfigLoad.js"
import { identityConfigLoad } from "./contexts/identity/identityConfigLoad.js"
import { identityMailAdapterDisabledCreate } from "./contexts/identity/identityMailAdapterDisabledCreate.js"
import { identityMailAdapterSmtpCreate } from "./contexts/identity/identityMailAdapterSmtpCreate.js"
import { identityTokenKeyPairResolve } from "./contexts/identity/identityTokenKeyPairResolve.js"
import { notificationHubCreate } from "./contexts/notifications/notificationHubCreate.js"
import { sendFileStorageAdapterCreate } from "./contexts/sends/sendFileStorageAdapterCreate.js"
import { twoFactorWebAuthnU2fMigrate } from "./contexts/twoFactor/twoFactorWebAuthnU2fMigrate.js"
import { databaseClose } from "./database/databaseClose.js"
import { databaseMigrate } from "./database/databaseMigrate.js"
import { databaseOpen } from "./database/databaseOpen.js"
import { serverJobDefinitionsCreate } from "./jobs/serverJobDefinitionsCreate.js"
import { serverJobRunnerCreate } from "./jobs/serverJobRunner.js"
import { releaseManifestRead } from "./release/releaseManifestRead.js"
import { responseSecurityHeadersApply } from "./responseSecurityHeadersApply.js"
import { serverAppCreate } from "./serverAppCreate.js"

const defaultLogger = loggerCreate()
const configResult = serverConfigLoad()
if (!configResult.success) {
  defaultLogger.error("server.configuration.invalid", { errorMessage: configResult.errorMessage })
  process.exit(1)
}

const logger = loggerCreate({ level: configResult.data.LOG_LEVEL })
const releaseResult = await releaseManifestRead()
if (!releaseResult.success) {
  logger.error("server.release.invalid", { errorMessage: releaseResult.errorMessage })
  process.exit(1)
}
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
const attachmentStorage = attachmentStorageCreate(configResult.data)
const notificationHub = notificationHubCreate({
  enabled: configResult.data.ENABLE_WEBSOCKET,
  proxy: configResult.data.PROXY,
  publicKey: tokenKeyPair.publicKey,
  publicOrigin: configResult.data.PUBLIC_ORIGIN,
})
const serverClock = clockCreate()
const mail = identityConfigResult.data.MAIL_ENABLED
  ? identityMailAdapterSmtpCreate({ config: configResult.data, publicOrigin: configResult.data.PUBLIC_ORIGIN })
  : identityMailAdapterDisabledCreate()
const jobRunner = serverJobRunnerCreate({
  jobs: serverJobDefinitionsCreate({
    clock: serverClock,
    database,
    attachmentStorage,
    identityConfig: identityConfigResult.data,
    logger,
    mail,
    sendStorage,
    serverConfig: configResult.data,
  }),
  logger,
})

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
    backup: adminBackupAdapterCreate({
      attachmentsFolder: configResult.data.ATTACHMENTS_FOLDER,
      databasePath: configResult.data.DATABASE_PATH,
      destinationRoot: configResult.data.BACKUP_FOLDER,
      sendsFolder: configResult.data.SENDS_FOLDER,
    }),
    databasePath: configResult.data.DATABASE_PATH,
  },
  icons: {
    cache: iconCacheAdapterCreate({ directory: iconConfigResult.data.ICON_CACHE_FOLDER }),
    config: iconConfigResult.data,
  },
  hibp: {
    apiKey: configResult.data.HIBP_API_KEY,
  },
  identity: {
    clientIp: {
      header: configResult.data.IP_HEADER,
      trustedProxies: configResult.data.IP_HEADER_TRUSTED_PROXIES,
    },
    config: identityConfigResult.data,
    privateKey: tokenKeyPair.privateKey,
    publicKey: tokenKeyPair.publicKey,
    publicOrigin: configResult.data.PUBLIC_ORIGIN,
    mail,
  },
  logger,
  release: releaseResult.data,
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
  attachments: {
    storage: attachmentStorage,
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
      if (upgradeResult !== undefined) return responseSecurityHeadersApply(upgradeResult)
      const remoteIpAddress = bunServer.requestIP(request)?.address
      return app.fetch(request, remoteIpAddress === undefined ? undefined : { remoteIpAddress })
    },
    hostname: configResult.data.HOST,
    port: configResult.data.PORT,
    websocket: notificationHub.websocket,
  })
  logger.info("server.started", {
    host: configResult.data.HOST,
    port: configResult.data.PORT,
  })
  jobRunner.start()

  let shutdownPromise: Promise<void> | undefined
  const shutdown = (): Promise<void> => {
    if (shutdownPromise !== undefined) return shutdownPromise
    shutdownPromise = (async () => {
      try {
        await server.stop(true)
      } catch {
        logger.error("server.stop-failed", { error: "stop-failed" })
      }
      await jobRunner.stop()
      try {
        const mailCloseResult = await mail.close?.()
        if (mailCloseResult !== undefined && !mailCloseResult.success)
          logger.error("mail.close-failed", { errorMessage: mailCloseResult.errorMessage })
      } catch {
        logger.error("mail.close-failed", { error: "close-failed" })
      }
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
