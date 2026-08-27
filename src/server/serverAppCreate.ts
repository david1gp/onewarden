import { Hono, type Context } from "hono"
import { createResultError } from "#result"
import { packageVersion } from "../packageVersion.js"
import { oneWardenDatabaseOpen } from "./oneWardenDatabaseOpen.js"
import { oneWardenConfigurationParse } from "./oneWardenConfigurationParse.js"
import type { OneWardenConfiguration } from "./oneWardenConfigurationSchema.js"

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
    "default-src 'none'; font-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; media-src 'self'; object-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; child-src 'self' https://*.duosecurity.com https://*.duofederal.com; frame-src 'self' https://*.duosecurity.com https://*.duofederal.com; frame-ancestors 'self' chrome-extension://nngceckbapebfimnlniiiahkandclblb chrome-extension://jbkfoedolllekgbhcbcoahefnbanhhlh moz-extension://*; img-src 'self' data: https://haveibeenpwned.com; connect-src 'self' https://api.pwnedpasswords.com https://api.2fa.directory https://app.simplelogin.io/api/ https://app.addy.io/api/ https://api.fastmail.com/ https://api.forwardemail.net;",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()",
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Robots-Tag": "noindex, nofollow",
  "X-XSS-Protection": "0",
} as const

const serverConfigurationErrorHeaders = { ...securityHeaders }

export function serverAppCreate(configurationInput: unknown = process.env): Hono {
  const application = new Hono()
  const configurationResult = oneWardenConfigurationParse(configurationInput)
  const databaseResult = configurationResult.success
    ? oneWardenDatabaseOpen(configurationResult.data.databasePath)
    : createResultError("oneWardenDatabaseOpen", "OneWarden database configuration is unavailable.")

  application.get("/alive", (context) => serverHealthGetResponseCreate(context, databaseResult))
  application.on("HEAD", "/alive", () => serverHealthHeadResponseCreate(databaseResult))
  application.get("/api/alive", (context) => serverHealthGetResponseCreate(context, databaseResult))
  application.get("/api/config", (context) => {
    if (!configurationResult.success) {
      return context.json(
        {
          error: {
            code: "platform.internal",
            message: "OneWarden configuration is unavailable.",
            op: configurationResult.op,
            retryable: false,
            status: 500,
          },
        },
        500,
        serverConfigurationErrorHeaders,
      )
    }

    return context.json(oneWardenConfigResponseCreate(configurationResult.data), 200, securityHeaders)
  })

  return application
}

function serverHealthGetResponseCreate(context: Context, databaseResult: ReturnType<typeof oneWardenDatabaseOpen>) {
  const readinessResult = databaseResult.success ? databaseResult.data.ready() : databaseResult
  if (!readinessResult.success) return serverHealthUnavailableResponseCreate(context, readinessResult)

  return context.json(oneWardenTimestampCreate(), 200, securityHeaders)
}

function serverHealthHeadResponseCreate(databaseResult: ReturnType<typeof oneWardenDatabaseOpen>): Response {
  const readinessResult = databaseResult.success ? databaseResult.data.ready() : databaseResult
  if (!readinessResult.success) return new Response(null, { headers: securityHeaders, status: 503 })

  return new Response(null, { headers: securityHeaders, status: 200 })
}

function serverHealthUnavailableResponseCreate(
  context: Context,
  readinessResult: { success: false; op: string; errorMessage: string },
) {
  return context.json(
    {
      error: {
        code: "platform.internal",
        message: "OneWarden database readiness is unavailable.",
        op: readinessResult.op,
        retryable: true,
        status: 503,
      },
    },
    503,
    serverConfigurationErrorHeaders,
  )
}

function oneWardenTimestampCreate(): string {
  return `${new Date().toISOString().replace("Z", "")}000Z`
}

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
    server: {
      name: "OneWarden",
      url: "https://github.com/david1gp/onewarden",
    },
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
    push: {
      pushTechnology: 0,
      vapidPublicKey: null,
    },
    featureStates,
    communication: null,
    object: "config",
  }
}
