import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import type { Context } from "hono"
import type { Clock } from "../shared/clock/clock.js"
import type { Identifier } from "../shared/identifier/identifier.js"
import type { Logger } from "../shared/logging/logger.js"
import { apiErrorCreate } from "../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../shared/api/apiErrorResponseCreate.js"
import { clockCreate } from "../shared/clock/clockCreate.js"
import { identifierCreate } from "../shared/identifier/identifierCreate.js"
import type { DatabaseConnection } from "./database/database.js"
import { identityConfigCreate } from "./contexts/identity/identityConfigCreate.js"
import { identityMailAdapterCreate } from "./contexts/identity/identityMailAdapterCreate.js"
import { identityRoutesRegister } from "./contexts/identity/identityRoutesRegister.js"
import type { IdentityRouteOptions } from "./contexts/identity/identityRouteOptions.js"
import { identitySsoAdapterCreate } from "./contexts/identity/identitySsoAdapterCreate.js"
import { identityTokenKeyPairResolve } from "./contexts/identity/identityTokenKeyPairResolve.js"
import { identityRateLimiter } from "./contexts/identity/identityRateLimiter.js"
import { packageVersion } from "../packageVersion.js"
import { oneWardenConfigurationParse } from "./oneWardenConfigurationParse.js"
import type { OneWardenConfiguration } from "./oneWardenConfigurationSchema.js"
import { oneWardenDatabaseOpen } from "./oneWardenDatabaseOpen.js"
import { requestLoggingMiddleware } from "./requestLoggingMiddleware.js"

type ServerAppEnvironment = {
  Variables: {
    database?: DatabaseConnection
  }
}

type ServerAppOptions = {
  clock?: Clock
  database?: DatabaseConnection
  databasePath?: string
  disableUserRegistration?: boolean | string
  domain?: string
  experimentalClientFeatureFlags?: string
  identity?: Partial<IdentityRouteOptions>
  identifier?: Identifier
  logger?: Logger
  signupAllowed?: boolean | string
  suppressOnboardingInterstitials?: boolean | string
  ONEWARDEN_CLIENT_SUPPRESS_ONBOARDING?: string
  ONEWARDEN_DOMAIN?: string
  ONEWARDEN_EXPERIMENTAL_CLIENT_FEATURE_FLAGS?: string
  ONEWARDEN_SIGNUPS_ALLOWED?: string
}

export function serverAppCreate(options?: ServerAppOptions): Hono<ServerAppEnvironment> {
  const app = new Hono<ServerAppEnvironment>()
  const database = options?.database
  const legacyMode = options !== undefined && (Object.keys(options).length === 0 || legacyOptionsPresent(options))
  const legacyConfigurationResult = legacyMode ? oneWardenConfigurationParse(options) : undefined
  const legacyDatabaseResult =
    legacyMode && options?.databasePath !== undefined && legacyConfigurationResult?.success
      ? oneWardenDatabaseOpen(legacyConfigurationResult.data.databasePath)
      : undefined
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

  if (legacyMode) {
    app.get("/alive", (context) => legacyHealthGetResponseCreate(context, legacyDatabaseResult))
    app.on("HEAD", "/alive", () => legacyHealthHeadResponseCreate(legacyDatabaseResult))
    app.get("/api/alive", (context) => legacyHealthGetResponseCreate(context, legacyDatabaseResult))
    app.get("/api/config", (context) => {
      if (legacyConfigurationResult === undefined || !legacyConfigurationResult.success) {
        return context.json(
          {
            error: {
              code: "platform.internal",
              message: "OneWarden configuration is unavailable.",
              op: legacyConfigurationResult?.op ?? "oneWardenConfigurationParse",
              retryable: false,
              status: 500,
            },
          },
          500,
          serverConfigurationErrorHeaders,
        )
      }

      return context.json(oneWardenConfigResponseCreate(legacyConfigurationResult.data), 200, securityHeaders)
    })
  }

  const identityOptions = options?.identity
  const hasCustomTokenKey = identityOptions?.privateKey !== undefined || identityOptions?.publicKey !== undefined
  const defaultKeyPairResult = hasCustomTokenKey
    ? undefined
    : identityTokenKeyPairResolve(identityOptions?.database ?? database)
  const defaultPrivateKey = defaultKeyPairResult?.success ? defaultKeyPairResult.data.privateKey : undefined
  const defaultPublicKey = defaultKeyPairResult?.success ? defaultKeyPairResult.data.publicKey : undefined
  const identityClock = identityOptions?.clock ?? options?.clock ?? clockCreate()
  const identityConfig = identityOptions?.config ?? identityConfigCreate()
  identityRoutesRegister(app, {
    clock: identityClock,
    config: identityConfig,
    database: identityOptions?.database ?? database,
    identifier: identityOptions?.identifier ?? options?.identifier ?? identifierCreate(),
    mail: identityOptions?.mail ?? identityMailAdapterCreate(),
    privateKey: identityOptions?.privateKey ?? defaultPrivateKey,
    publicKey: identityOptions?.publicKey ?? defaultPublicKey,
    publicOrigin: identityOptions?.publicOrigin,
    rateLimiter: identityOptions?.rateLimiter ?? identityRateLimiter(identityConfig, identityClock),
    sso: identityOptions?.sso ?? identitySsoAdapterCreate(identityConfig, identityOptions?.publicOrigin, identityClock),
  })
  return app
}

function legacyOptionsPresent(options: ServerAppOptions): boolean {
  return (
    options.databasePath !== undefined ||
    options.disableUserRegistration !== undefined ||
    options.domain !== undefined ||
    options.experimentalClientFeatureFlags !== undefined ||
    options.signupAllowed !== undefined ||
    options.suppressOnboardingInterstitials !== undefined ||
    options.ONEWARDEN_CLIENT_SUPPRESS_ONBOARDING !== undefined ||
    options.ONEWARDEN_DOMAIN !== undefined ||
    options.ONEWARDEN_EXPERIMENTAL_CLIENT_FEATURE_FLAGS !== undefined ||
    options.ONEWARDEN_SIGNUPS_ALLOWED !== undefined
  )
}

type LegacyDatabaseResult = ReturnType<typeof oneWardenDatabaseOpen> | undefined

function legacyHealthGetResponseCreate(context: Context, databaseResult: LegacyDatabaseResult) {
  const readinessResult = databaseResult?.success ? databaseResult.data.ready() : databaseResult
  if (readinessResult === undefined || !readinessResult.success) {
    return context.json(
      {
        error: {
          code: "platform.internal",
          message: "OneWarden database readiness is unavailable.",
          op: readinessResult?.op ?? "oneWardenDatabaseOpen",
          retryable: true,
          status: 503,
        },
      },
      503,
      serverConfigurationErrorHeaders,
    )
  }

  return context.json(oneWardenTimestampCreate(), 200, securityHeaders)
}

function legacyHealthHeadResponseCreate(databaseResult: LegacyDatabaseResult): Response {
  const readinessResult = databaseResult?.success ? databaseResult.data.ready() : databaseResult
  if (readinessResult === undefined || !readinessResult.success)
    return new Response(null, { headers: securityHeaders, status: 503 })

  return new Response(null, { headers: securityHeaders, status: 200 })
}

function oneWardenTimestampCreate(): string {
  return `${new Date().toISOString().replace("Z", "")}000Z`
}

const supportedFeatureFlags = new Set([
  "desktop-ui-migration-milestone-1",
  "desktop-ui-migration-milestone-2",
  "desktop-ui-migration-milestone-3",
  "desktop-ui-migration-milestone-4",
  "pm-5594-safari-account-switching",
  "ssh-agent",
  "ssh-agent-v2",
  "ssh-key-vault-item",
  "pm-25373-windows-biometrics-v2",
  "pm-26340-linux-biometrics-v2",
  "anon-addy-self-host-alias",
  "simple-login-self-host-alias",
  "mutual-tls",
  "cxp-import-mobile",
  "cxp-export-mobile",
  "pm-30529-webauthn-related-origins",
])

const securityHeaders = {
  "Cache-Control": "no-cache, no-store, max-age=0",
  "Content-Security-Policy":
    "default-src 'none'; font-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; media-src 'self'; object-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; child-src 'self' https://*.duosecurity.com https://*.duofederal.com; frame-src 'self' https://*.duosecurity.com https://*.duofederal.com; frame-ancestors 'self' chrome-extension://nngceckbapebfimnlniiiahkandclblb chrome-extension://jbkfoedolllekgbhcbcoahefnbanhhlh moz-extension://*; img-src 'self' data: https://haveibeenpwned.com; connect-src 'self' https://api.pwnedpasswords.com https://api.2fa.directory https://app.simplelogin.io/api/ https://app.addy.io/api/ https://api.fastmail.com/ https://api.forwardemail.net/",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-not-in-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()",
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Robots-Tag": "noindex, nofollow",
  "X-XSS-Protection": "0",
} as const

const serverConfigurationErrorHeaders = { ...securityHeaders }

function oneWardenConfigResponseCreate(configuration: OneWardenConfiguration) {
  const featureStates = Object.fromEntries(
    configuration.experimentalClientFeatureFlags
      .split(",")
      .map((flag) => flag.trim())
      .filter((flag) => flag.length > 0 && supportedFeatureFlags.has(flag))
      .map((flag) => [flag, true]),
  )
  featureStates["pm-19148-innovation-archive"] = true

  return {
    version: packageVersion,
    gitHash: null,
    server: { name: "OneWarden", url: "https://github.com/david1gp/onewarden" },
    settings: {
      disableUserRegistration: configuration.disableUserRegistration,
      suppressOnboardingInterstitials: configuration.suppressOnboardingInterstitials,
    },
    environment: {
      vault: configuration.domain,
      api: `${configuration.domain}/api`,
      identity: `${configuration.domain}/identity`,
      notifications: `${configuration.domain}/notifications`,
      sso: "",
      cloudRegion: null,
    },
    push: { pushTechnology: 0, vapidPublicKey: null },
    featureStates,
    communication: null,
    object: "config",
  }
}
