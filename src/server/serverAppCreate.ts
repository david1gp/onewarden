import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { apiErrorCreate } from "../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../shared/api/apiErrorResponseCreate.js"
import type { Clock } from "../shared/clock/clock.js"
import { clockCreate } from "../shared/clock/clockCreate.js"
import type { Identifier } from "../shared/identifier/identifier.js"
import { identifierCreate } from "../shared/identifier/identifierCreate.js"
import type { Logger } from "../shared/logging/logger.js"
import { adminConfigCreate } from "./contexts/admin/adminConfigCreate.js"
import type { AdminRouteOptions } from "./contexts/admin/adminRouteOptions.js"
import { adminRoutesRegister } from "./contexts/admin/adminRoutesRegister.js"
import type { AuthenticationEnvironment } from "./contexts/authentication/authenticationEnvironment.js"
import type { CipherNotificationAdapter } from "./contexts/ciphers/cipherNotificationAdapter.js"
import { cipherRoutesRegister } from "./contexts/ciphers/cipherRoutesRegister.js"
import type { FolderNotificationAdapter } from "./contexts/folders/folderNotificationAdapter.js"
import { folderRoutesRegister } from "./contexts/folders/folderRoutesRegister.js"
import type { NotificationHub } from "./contexts/notifications/notificationHub.js"
import { notificationHubCreate } from "./contexts/notifications/notificationHubCreate.js"
import { notificationRoutesRegister } from "./contexts/notifications/notificationRoutesRegister.js"
import { organizationPublicRoutesRegister } from "./contexts/organizations/organizationPublicRoutesRegister.js"
import type { PushRelayAdapter } from "./contexts/push/pushRelayAdapter.js"
import { pushRelayAdapterCreate } from "./contexts/push/pushRelayAdapterCreate.js"
import { pushRelayConfigurationCreate } from "./contexts/push/pushRelayConfigurationCreate.js"
import type { PushRelayConfiguration } from "./contexts/push/pushRelayConfiguration.js"
import type { IconRouteOptions } from "./contexts/icons/iconRouteOptions.js"
import { iconRoutesRegister } from "./contexts/icons/iconRoutesRegister.js"
import { identityConfigCreate } from "./contexts/identity/identityConfigCreate.js"
import { identityMailAdapterCreate } from "./contexts/identity/identityMailAdapterCreate.js"
import { identityRateLimiter } from "./contexts/identity/identityRateLimiter.js"
import type { IdentityRouteOptions } from "./contexts/identity/identityRouteOptions.js"
import { identityRoutesRegister } from "./contexts/identity/identityRoutesRegister.js"
import { identitySsoAdapterCreate } from "./contexts/identity/identitySsoAdapterCreate.js"
import { identityTokenKeyPairResolve } from "./contexts/identity/identityTokenKeyPairResolve.js"
import type { WebRouteOptions } from "./contexts/web/webRouteOptions.js"
import { webRoutesRegister } from "./contexts/web/webRoutesRegister.js"
import type { DatabaseConnection } from "./database/database.js"
import { requestLoggingMiddleware } from "./requestLoggingMiddleware.js"

type ServerAppEnvironment = AuthenticationEnvironment

type ServerAppOptions = {
  clock?: Clock
  database?: DatabaseConnection
  ciphers?: { notification?: CipherNotificationAdapter }
  folders?: { notification?: FolderNotificationAdapter }
  icons?: Partial<IconRouteOptions>
  identity?: Partial<IdentityRouteOptions>
  identifier?: Identifier
  logger?: Logger
  notifications?: { enabled?: boolean; hub?: NotificationHub; proxy?: boolean }
  organizations?: { groupsEnabled?: boolean }
  push?: { adapter?: PushRelayAdapter; configuration?: PushRelayConfiguration }
  web?: Partial<
    Pick<WebRouteOptions, "publicOrigin" | "staticFolder" | "version" | "webVaultEnabled" | "webVaultFolder">
  >
  admin?: Omit<Partial<AdminRouteOptions>, "config"> & { config?: Partial<AdminRouteOptions["config"]> }
}

export function serverAppCreate(options?: ServerAppOptions): Hono<ServerAppEnvironment> {
  const app = new Hono<ServerAppEnvironment>()
  const serverClock = options?.clock ?? clockCreate()
  const database = options?.database
  if (database !== undefined) {
    app.use("*", async (context, next) => {
      context.set("database", database)
      await next()
    })
  }
  app.use("*", requestLoggingMiddleware(options))
  app.onError((error, context) => {
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
    void context
    return apiErrorResponseCreate(apiErrorCreate("serverAppError", "platform.internal", "Internal server error."))
  })
  app.notFound(() => apiErrorResponseCreate(apiErrorCreate("serverAppNotFound", "platform.not-found", "Not found.")))
  app.get("/health", (context) => context.json({ status: "ok" }))

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
  const push =
    options?.push?.adapter ??
    identityOptions?.push ??
    pushRelayAdapterCreate(options?.push?.configuration ?? pushRelayConfigurationCreate(), {
      clock: identityClock,
      identifier: identityIdentifier,
      logger: options?.logger,
    })
  const adminOptions = options?.admin
  const adminConfig = adminConfigCreate(adminOptions?.config)
  adminRoutesRegister(app, {
    clock: adminOptions?.clock ?? serverClock,
    config: adminConfig,
    database: adminOptions?.database ?? database,
    databasePath: adminOptions?.databasePath,
    diagnostics: adminOptions?.diagnostics,
    identityConfig,
    identifier: adminOptions?.identifier ?? identityIdentifier,
    mail: adminOptions?.mail ?? identityOptions?.mail ?? identityMailAdapterCreate(identityClock),
    privateKey: adminOptions?.privateKey ?? defaultPrivateKey,
    publicKey: adminOptions?.publicKey ?? defaultPublicKey,
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
    database: identityDatabase,
    identifier: identityIdentifier,
    mail: identityOptions?.mail ?? identityMailAdapterCreate(identityClock),
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
    push,
    rateLimiter: identityOptions?.rateLimiter ?? identityRateLimiter(identityConfig, identityClock),
    sso: identityOptions?.sso ?? identitySsoAdapterCreate(identityConfig, identityOptions?.publicOrigin, identityClock),
  })
  organizationPublicRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    groupsEnabled: options?.organizations?.groupsEnabled ?? false,
    identifier: identityIdentifier,
    mail: identityOptions?.mail ?? identityMailAdapterCreate(identityClock),
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
    clock: identityClock,
    database: identityDatabase,
    identifier: identityIdentifier,
    notification: options?.ciphers?.notification ?? notificationHub.adapter,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
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
