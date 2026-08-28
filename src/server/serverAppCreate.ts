import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { apiErrorCreate } from "../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../shared/api/apiErrorResponseCreate.js"
import type { Clock } from "../shared/clock/clock.js"
import { clockCreate } from "../shared/clock/clockCreate.js"
import type { Identifier } from "../shared/identifier/identifier.js"
import { identifierCreate } from "../shared/identifier/identifierCreate.js"
import type { Logger } from "../shared/logging/logger.js"
import type { AuthenticationEnvironment } from "./contexts/authentication/authenticationEnvironment.js"
import type { FolderNotificationAdapter } from "./contexts/folders/folderNotificationAdapter.js"
import { folderRoutesRegister } from "./contexts/folders/folderRoutesRegister.js"
import { identityConfigCreate } from "./contexts/identity/identityConfigCreate.js"
import { identityMailAdapterCreate } from "./contexts/identity/identityMailAdapterCreate.js"
import { identityRateLimiter } from "./contexts/identity/identityRateLimiter.js"
import type { IdentityRouteOptions } from "./contexts/identity/identityRouteOptions.js"
import { identityRoutesRegister } from "./contexts/identity/identityRoutesRegister.js"
import { identitySsoAdapterCreate } from "./contexts/identity/identitySsoAdapterCreate.js"
import { identityTokenKeyPairResolve } from "./contexts/identity/identityTokenKeyPairResolve.js"
import type { DatabaseConnection } from "./database/database.js"
import { requestLoggingMiddleware } from "./requestLoggingMiddleware.js"

type ServerAppEnvironment = AuthenticationEnvironment

type ServerAppOptions = {
  clock?: Clock
  database?: DatabaseConnection
  folders?: { notification?: FolderNotificationAdapter }
  identity?: Partial<IdentityRouteOptions>
  identifier?: Identifier
  logger?: Logger
}

export function serverAppCreate(options?: ServerAppOptions): Hono<ServerAppEnvironment> {
  const app = new Hono<ServerAppEnvironment>()
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
  const identityClock = identityOptions?.clock ?? options?.clock ?? clockCreate()
  const identityConfig = identityOptions?.config ?? identityConfigCreate()
  const identityDatabase = identityOptions?.database ?? database
  const identityIdentifier = identityOptions?.identifier ?? options?.identifier ?? identifierCreate()
  identityRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityDatabase,
    identifier: identityIdentifier,
    mail: identityOptions?.mail ?? identityMailAdapterCreate(),
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
    rateLimiter: identityOptions?.rateLimiter ?? identityRateLimiter(identityConfig, identityClock),
    sso: identityOptions?.sso ?? identitySsoAdapterCreate(identityConfig, identityOptions?.publicOrigin, identityClock),
  })
  folderRoutesRegister(app, {
    clock: identityClock,
    database: identityDatabase,
    identifier: identityIdentifier,
    notification: options?.folders?.notification,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
  })
  return app
}
