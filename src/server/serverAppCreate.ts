import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { apiErrorCreate } from "../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../shared/api/apiErrorResponseCreate.js"
import type { Clock } from "../shared/clock/clock.js"
import { clockCreate } from "../shared/clock/clockCreate.js"
import type { Identifier } from "../shared/identifier/identifier.js"
import { identifierCreate } from "../shared/identifier/identifierCreate.js"
import type { Logger } from "../shared/logging/logger.js"
import { loggerCreate } from "../shared/logging/loggerCreate.js"
import { adminConfigCreate } from "./contexts/admin/adminConfigCreate.js"
import type { AdminRouteOptions } from "./contexts/admin/adminRouteOptions.js"
import { adminRoutesRegister } from "./contexts/admin/adminRoutesRegister.js"
import type { AttachmentFileStorageAdapter } from "./contexts/attachments/attachmentFileStorageAdapter.js"
import { attachmentFileStorageAdapterCreate } from "./contexts/attachments/attachmentFileStorageAdapterCreate.js"
import { attachmentRoutesRegister } from "./contexts/attachments/attachmentRoutesRegister.js"
import type { AuthenticationEnvironment } from "./contexts/authentication/authenticationEnvironment.js"
import type { CipherNotificationAdapter } from "./contexts/ciphers/cipherNotificationAdapter.js"
import { cipherRoutesRegister } from "./contexts/ciphers/cipherRoutesRegister.js"
import type { EmergencyAccessNotificationAdapter } from "./contexts/emergencyAccess/emergencyAccessNotificationAdapter.js"
import { emergencyAccessRoutesRegister } from "./contexts/emergencyAccess/emergencyAccessRoutesRegister.js"
import type { EventAdapter } from "./contexts/events/eventAdapter.js"
import { eventAdapterCreate } from "./contexts/events/eventAdapterCreate.js"
import { eventAdapterSafeCreate } from "./contexts/events/eventAdapterSafeCreate.js"
import type { EventNotificationAdapter } from "./contexts/events/eventNotificationAdapter.js"
import { eventRoutesRegister } from "./contexts/events/eventRoutesRegister.js"
import type { FolderNotificationAdapter } from "./contexts/folders/folderNotificationAdapter.js"
import { folderRoutesRegister } from "./contexts/folders/folderRoutesRegister.js"
import type { HibpHttpAdapter } from "./contexts/hibp/hibpHttpAdapter.js"
import { hibpHttpAdapterCreate } from "./contexts/hibp/hibpHttpAdapterCreate.js"
import { hibpRoutesRegister } from "./contexts/hibp/hibpRoutesRegister.js"
import type { IconRouteOptions } from "./contexts/icons/iconRouteOptions.js"
import { iconRoutesRegister } from "./contexts/icons/iconRoutesRegister.js"
import { identityConfigCreate } from "./contexts/identity/identityConfigCreate.js"
import { identityMailAdapterCreate } from "./contexts/identity/identityMailAdapterCreate.js"
import { identityRateLimiter } from "./contexts/identity/identityRateLimiter.js"
import type { IdentityRouteOptions } from "./contexts/identity/identityRouteOptions.js"
import { identityRoutesRegister } from "./contexts/identity/identityRoutesRegister.js"
import { identitySsoAdapterCreate } from "./contexts/identity/identitySsoAdapterCreate.js"
import { identityTokenKeyPairResolve } from "./contexts/identity/identityTokenKeyPairResolve.js"
import type { NotificationAdapter } from "./contexts/notifications/notificationAdapter.js"
import type { NotificationHub } from "./contexts/notifications/notificationHub.js"
import { notificationHubCreate } from "./contexts/notifications/notificationHubCreate.js"
import { notificationRoutesRegister } from "./contexts/notifications/notificationRoutesRegister.js"
import { organizationPublicRoutesRegister } from "./contexts/organizations/organizationPublicRoutesRegister.js"
import type { OrganizationRouteOptions } from "./contexts/organizations/organizationRouteOptions.js"
import { organizationRoutesRegister } from "./contexts/organizations/organizationRoutesRegister.js"
import type { PushRelayAdapter } from "./contexts/push/pushRelayAdapter.js"
import { pushRelayAdapterCreate } from "./contexts/push/pushRelayAdapterCreate.js"
import type { PushRelayConfiguration } from "./contexts/push/pushRelayConfiguration.js"
import { pushRelayConfigurationCreate } from "./contexts/push/pushRelayConfigurationCreate.js"
import type { SendFileStorageAdapter } from "./contexts/sends/sendFileStorageAdapter.js"
import type { SendNotificationAdapter } from "./contexts/sends/sendNotificationAdapter.js"
import type { SendRateLimiter } from "./contexts/sends/sendRouteOptions.js"
import { sendRoutesRegister } from "./contexts/sends/sendRoutesRegister.js"
import { syncRoutesRegister } from "./contexts/sync/syncRoutesRegister.js"
import type { WebRouteOptions } from "./contexts/web/webRouteOptions.js"
import { webRoutesRegister } from "./contexts/web/webRoutesRegister.js"
import type { DatabaseConnection } from "./database/database.js"
import { databaseSchemaTablesValidate } from "./database/databaseSchemaTablesValidate.js"
import type { ReleaseManifest } from "./release/releaseManifestSchema.js"
import { requestLoggingMiddleware } from "./requestLoggingMiddleware.js"
import { securityHeadersMiddleware } from "./securityHeadersMiddleware.js"

type ServerAppEnvironment = AuthenticationEnvironment

type ServerReleaseIdentity = Pick<ReleaseManifest, "artifactSha256" | "gitHead" | "schemaIdentity" | "schemaVersion">

type ServerAppOptions = {
  clock?: Clock
  database?: DatabaseConnection
  ciphers?: { maxNoteSize?: number; notification?: CipherNotificationAdapter }
  emergencyAccess?: { notification?: EmergencyAccessNotificationAdapter }
  events?: { adapter?: EventAdapter; notification?: EventNotificationAdapter }
  folders?: { notification?: FolderNotificationAdapter }
  hibp?: { apiKey?: string | null; http?: HibpHttpAdapter }
  icons?: Partial<IconRouteOptions>
  identity?: Partial<IdentityRouteOptions>
  identifier?: Identifier
  logger?: Logger
  release?: ServerReleaseIdentity
  notifications?: { enabled?: boolean; hub?: NotificationHub; proxy?: boolean }
  organizations?: {
    domainDnsResolve?: OrganizationRouteOptions["domainDnsResolve"]
    groupsEnabled?: boolean
    notification?: NotificationAdapter
  }
  push?: { adapter?: PushRelayAdapter; configuration?: PushRelayConfiguration }
  sends?: {
    mail?: IdentityRouteOptions["mail"]
    notification?: SendNotificationAdapter
    push?: PushRelayAdapter
    quotaBytes?: number | null
    rateLimiter?: SendRateLimiter
    sendsAllowed?: boolean
    storage?: SendFileStorageAdapter
  }
  web?: Partial<
    Pick<WebRouteOptions, "publicOrigin" | "staticFolder" | "version" | "webVaultEnabled" | "webVaultFolder">
  >
  admin?: Omit<Partial<AdminRouteOptions>, "config"> & { config?: Partial<AdminRouteOptions["config"]> }
  attachments?: {
    maxFileSizeBytes?: number
    notification?: CipherNotificationAdapter
    organizationQuotaBytes?: number | null
    push?: PushRelayAdapter
    quotaBytes?: number | null
    storage?: AttachmentFileStorageAdapter
    userQuotaBytes?: number | null
  }
}

const serverSafeErrorNames = new Set([
  "AggregateError",
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
])

function serverHealthResponseCreate(
  status: "ok" | "unavailable",
  statusCode: 200 | 503,
  release: ServerReleaseIdentity | undefined,
): Response {
  const headers = new Headers({ "cache-control": "no-store", "content-type": "application/json" })
  if (release !== undefined) {
    headers.set("x-onewarden-release-artifact", release.artifactSha256)
    headers.set("x-onewarden-release-commit", release.gitHead)
    headers.set("x-onewarden-schema-identity", release.schemaIdentity)
    headers.set("x-onewarden-schema-version", String(release.schemaVersion))
  }
  return new Response(JSON.stringify({ status }), {
    headers,
    status: statusCode,
  })
}

function serverHealthReadyResponseCreate(
  database: DatabaseConnection | undefined,
  release: ServerReleaseIdentity | undefined,
): Response {
  if (database !== undefined && databaseSchemaTablesValidate(database).success)
    return serverHealthResponseCreate("ok", 200, release)
  return serverHealthResponseCreate("unavailable", 503, release)
}

function serverErrorIdentityRead(error: unknown): Readonly<{ name: string }> {
  if (!(error instanceof Error)) return { name: typeof error }
  if (error instanceof HTTPException) return { name: "HTTPException" }
  return { name: serverSafeErrorNames.has(error.name) ? error.name : "Error" }
}

export function serverAppCreate(options?: ServerAppOptions): Hono<ServerAppEnvironment> {
  const app = new Hono<ServerAppEnvironment>()
  const serverClock = options?.clock ?? clockCreate()
  const logger = options?.logger ?? loggerCreate({ clock: serverClock })
  const database = options?.database
  const release = options?.release
  if (database !== undefined) {
    app.use("*", async (context, next) => {
      context.set("database", database)
      await next()
    })
  }
  app.use("*", securityHeadersMiddleware())
  app.use("*", requestLoggingMiddleware({ ...options, clock: serverClock, logger }))
  app.onError((error, context) => {
    const response = (() => {
      if (error instanceof HTTPException) {
        const code =
          error.status === 400
            ? "platform.invalid-request"
            : error.status === 401
              ? "platform.unauthorized"
              : error.status === 403
                ? "platform.forbidden"
                : error.status === 404
                  ? "platform.not-found"
                  : error.status === 409
                    ? "platform.conflict"
                    : error.status === 429
                      ? "platform.rate-limited"
                      : error.status === 503
                        ? "platform.unavailable"
                        : "platform.internal"
        return apiErrorResponseCreate(apiErrorCreate("serverAppError", code, error.message))
      }
      return apiErrorResponseCreate(apiErrorCreate("serverAppError", "platform.internal", "Internal server error."))
    })()
    logger.error("request.failed", {
      error: serverErrorIdentityRead(error),
      method: context.req.method,
      path: context.req.path,
      requestId: context.get("requestId"),
      status: response.status,
    })
    return response
  })
  app.notFound(() => apiErrorResponseCreate(apiErrorCreate("serverAppNotFound", "platform.not-found", "Not found.")))
  app.get("/health/live", () => serverHealthResponseCreate("ok", 200, release))
  app.get("/health/ready", () => serverHealthReadyResponseCreate(database, release))
  app.get("/health", () => serverHealthReadyResponseCreate(database, release))

  const identityOptions = options?.identity
  const hasCustomTokenKey = identityOptions?.privateKey !== undefined || identityOptions?.publicKey !== undefined
  const defaultKeyPairResult = hasCustomTokenKey
    ? undefined
    : identityTokenKeyPairResolve(identityOptions?.database ?? database)
  const defaultPrivateKey = defaultKeyPairResult?.success ? defaultKeyPairResult.data.privateKey : undefined
  const defaultPublicKey = defaultKeyPairResult?.success ? defaultKeyPairResult.data.publicKey : undefined
  const identityClock = identityOptions?.clock ?? serverClock
  const identityConfig = identityOptions?.config ?? identityConfigCreate()
  const webVaultEnabled = options?.web?.webVaultEnabled ?? true
  const identityDatabase = identityOptions?.database ?? database
  const identityIdentifier = identityOptions?.identifier ?? options?.identifier ?? identifierCreate()
  const eventAdapterSource =
    options?.events?.adapter ??
    (identityDatabase === undefined
      ? undefined
      : eventAdapterCreate({
          clock: identityClock,
          database: identityDatabase,
          enabled: identityConfig.ORG_EVENTS_ENABLED,
          identifier: identityIdentifier,
          notification: options?.events?.notification,
        }))
  const eventAdapter = eventAdapterSource === undefined ? undefined : eventAdapterSafeCreate(eventAdapterSource)
  const identityMail =
    identityOptions?.mail ??
    identityMailAdapterCreate(identityClock, identityOptions?.publicOrigin ?? options?.web?.publicOrigin)
  const push =
    options?.push?.adapter ??
    identityOptions?.push ??
    pushRelayAdapterCreate(options?.push?.configuration ?? pushRelayConfigurationCreate(), {
      clock: identityClock,
      identifier: identityIdentifier,
      logger: options?.logger,
    })
  const attachmentStorage = options?.attachments?.storage ?? attachmentFileStorageAdapterCreate()
  const adminOptions = options?.admin
  const adminConfig = adminConfigCreate(adminOptions?.config)
  adminRoutesRegister(app, {
    clock: adminOptions?.clock ?? serverClock,
    config: adminConfig,
    database: adminOptions?.database ?? database,
    databasePath: adminOptions?.databasePath,
    event: eventAdapter,
    diagnostics: adminOptions?.diagnostics,
    identityConfig,
    identifier: adminOptions?.identifier ?? identityIdentifier,
    mail: adminOptions?.mail ?? identityMail,
    privateKey: adminOptions?.privateKey ?? identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: adminOptions?.publicKey ?? identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: adminOptions?.publicOrigin ?? identityOptions?.publicOrigin,
    push: adminOptions?.push ?? push,
    backup: adminOptions?.backup,
    configuration: adminOptions?.configuration,
    version: adminOptions?.version ?? options?.web?.version,
    webVaultEnabled: adminOptions?.webVaultEnabled ?? webVaultEnabled,
  })
  const notificationHub =
    options?.notifications?.hub ??
    notificationHubCreate({
      clock: identityClock,
      enabled: options?.notifications?.enabled,
      identifier: identityIdentifier,
      proxy: options?.notifications?.proxy,
      publicKey: identityOptions?.publicKey ?? defaultPublicKey,
      publicOrigin: identityOptions?.publicOrigin,
    })
  identityRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    clientIp: identityOptions?.clientIp,
    database: identityDatabase,
    anonymousAuthRequestResponseSend:
      identityOptions?.anonymousAuthRequestResponseSend ?? notificationHub.sendAnonymousAuthResponse,
    groupsEnabled: options?.organizations?.groupsEnabled ?? false,
    event: eventAdapter,
    identifier: identityIdentifier,
    mail: identityMail,
    notification: identityOptions?.notification ?? notificationHub.adapter,
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
    push,
    rateLimiter: identityOptions?.rateLimiter ?? identityRateLimiter(identityConfig, identityClock),
    sso: identityOptions?.sso ?? identitySsoAdapterCreate(identityConfig, identityOptions?.publicOrigin, identityClock),
    twoFactor: identityOptions?.twoFactor,
  })
  eventRoutesRegister(app, {
    clock: identityClock,
    database: identityDatabase,
    enabled: identityConfig.ORG_EVENTS_ENABLED,
    event: eventAdapter,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
  })
  organizationPublicRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    groupsEnabled: options?.organizations?.groupsEnabled ?? false,
    identifier: identityIdentifier,
    mail: identityMail,
    notification: options?.organizations?.notification ?? notificationHub.adapter,
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
  })
  organizationRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    event: eventAdapter,
    groupsEnabled: options?.organizations?.groupsEnabled ?? false,
    identifier: identityIdentifier,
    mail: identityMail,
    notification: options?.organizations?.notification ?? notificationHub.adapter,
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
    domainDnsResolve: options?.organizations?.domainDnsResolve,
  })
  emergencyAccessRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    identifier: identityIdentifier,
    mail: identityMail,
    notification: options?.emergencyAccess?.notification,
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
  })
  folderRoutesRegister(app, {
    clock: identityClock,
    database: identityDatabase,
    identifier: identityIdentifier,
    notification: options?.folders?.notification ?? notificationHub.adapter,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
    push,
  })
  cipherRoutesRegister(app, {
    attachmentStorage,
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    groupsEnabled: options?.organizations?.groupsEnabled ?? false,
    event: eventAdapter,
    identifier: identityIdentifier,
    maxNoteSize: options?.ciphers?.maxNoteSize,
    notification: options?.ciphers?.notification ?? notificationHub.adapter,
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
  })
  attachmentRoutesRegister(app, {
    clock: identityClock,
    database: identityDatabase,
    groupsEnabled: options?.organizations?.groupsEnabled ?? false,
    event: eventAdapter,
    identifier: identityIdentifier,
    maxFileSizeBytes: options?.attachments?.maxFileSizeBytes,
    notification: options?.attachments?.notification ?? notificationHub.adapter,
    organizationQuotaBytes: options?.attachments?.organizationQuotaBytes,
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
    push: options?.attachments?.push ?? push,
    quotaBytes: options?.attachments?.quotaBytes,
    storage: attachmentStorage,
    userQuotaBytes: options?.attachments?.userQuotaBytes,
  })
  syncRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    groupsEnabled: options?.organizations?.groupsEnabled ?? false,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
  })
  hibpRoutesRegister(app, {
    apiKey: options?.hibp?.apiKey,
    clock: identityClock,
    database: identityDatabase,
    http: options?.hibp?.http ?? hibpHttpAdapterCreate(),
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
  })
  sendRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    identifier: identityIdentifier,
    mail: options?.sends?.mail ?? identityMail,
    notification: options?.sends?.notification ?? notificationHub.adapter,
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
    push: options?.sends?.push ?? push,
    quotaBytes: options?.sends?.quotaBytes,
    rateLimiter: options?.sends?.rateLimiter ?? identityOptions?.rateLimiter,
    sendsAllowed: options?.sends?.sendsAllowed,
    storage: options?.sends?.storage,
  })
  iconRoutesRegister(app, {
    ...options?.icons,
    clock: options?.icons?.clock ?? serverClock,
    logger: options?.icons?.logger ?? options?.logger,
  })
  webRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    publicOrigin: options?.web?.publicOrigin ?? identityOptions?.publicOrigin,
    staticFolder: options?.web?.staticFolder,
    version: options?.web?.version,
    webVaultEnabled,
    webVaultFolder: options?.web?.webVaultFolder,
  })
  notificationRoutesRegister(app, notificationHub.enabled)
  return app
}
