import { expect, test } from "bun:test"
import { packageVersion } from "../../src/packageVersion.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"

const expectedSecurityHeaders = {
  "cache-control": "no-cache, no-store, max-age=0",
  "content-security-policy": expect.any(String),
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": expect.any(String),
  "referrer-policy": "same-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "x-robots-tag": "noindex, nofollow",
  "x-xss-protection": "0",
}

test("GET /api/config returns the default client configuration", async () => {
  const response = await serverAppCreate({}).request("http://onewarden.test/api/config")

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  expect(await response.json()).toEqual({
    version: packageVersion,
    gitHash: null,
    server: { name: "OneWarden", url: "https://github.com/david1gp/onewarden" },
    settings: { disableUserRegistration: false, suppressOnboardingInterstitials: false },
    environment: {
      vault: "http://localhost",
      api: "http://localhost/api",
      identity: "http://localhost/identity",
      notifications: "http://localhost/notifications",
      sso: "",
      cloudRegion: null,
    },
    push: { pushTechnology: 0, vapidPublicKey: null },
    featureStates: { "pm-19148-innovation-archive": true },
    communication: null,
    object: "config",
  })
})

test("GET /api/config derives alternate domain and settings from environment-shaped input", async () => {
  const response = await serverAppCreate({
    ONEWARDEN_CLIENT_SUPPRESS_ONBOARDING: "true",
    ONEWARDEN_DOMAIN: "https://vault.example.test/",
    ONEWARDEN_EXPERIMENTAL_CLIENT_FEATURE_FLAGS: "ssh-agent, unknown-flag",
    ONEWARDEN_SIGNUPS_ALLOWED: "false",
  }).request("http://onewarden.test/api/config")

  const body = (await response.json()) as Record<string, unknown>
  expect(body.settings).toEqual({ disableUserRegistration: true, suppressOnboardingInterstitials: true })
  expect(body.environment).toEqual({
    vault: "https://vault.example.test",
    api: "https://vault.example.test/api",
    identity: "https://vault.example.test/identity",
    notifications: "https://vault.example.test/notifications",
    sso: "",
    cloudRegion: null,
  })
  expect(body.featureStates).toEqual({ "ssh-agent": true, "pm-19148-innovation-archive": true })
})

test("GET /api/config has the documented keys and compatibility security headers", async () => {
  const response = await serverAppCreate({}).request("http://onewarden.test/api/config")
  const body = (await response.json()) as Record<string, unknown>

  expect(Object.keys(body).sort()).toEqual([
    "communication",
    "environment",
    "featureStates",
    "gitHash",
    "object",
    "push",
    "server",
    "settings",
    "version",
  ])
  expect(Object.fromEntries(response.headers)).toEqual(expect.objectContaining(expectedSecurityHeaders))
})

test("GET /api/config only reports supported configured feature flags and always enables the archive flag", async () => {
  const response = await serverAppCreate({
    experimentalClientFeatureFlags: "ssh-agent,not-supported,ssh-agent,pm-30529-webauthn-related-origins",
  }).request("http://onewarden.test/api/config")

  const body = (await response.json()) as { featureStates: unknown }
  expect(body.featureStates).toEqual({
    "ssh-agent": true,
    "pm-30529-webauthn-related-origins": true,
    "pm-19148-innovation-archive": true,
  })
})
