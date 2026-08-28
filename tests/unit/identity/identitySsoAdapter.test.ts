import { afterEach, expect, test } from "bun:test"
import { exportJWK, SignJWT } from "jose"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identitySsoAdapterCreate } from "../../../src/server/contexts/identity/identitySsoAdapterCreate.js"
import type { IdentitySsoAuth } from "../../../src/server/contexts/identity/identitySsoAuth.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const originalFetch = globalThis.fetch

type FetchCall = {
  body: string
  headers: Array<[string, string]>
  method: string
  url: string
}

function fetchCallRead(input: RequestInfo | URL, init?: RequestInit): FetchCall {
  const request = input instanceof Request ? input : undefined
  const headers = new Headers(init?.headers ?? request?.headers)
  return {
    body:
      typeof init?.body === "string" ? init.body : init?.body instanceof URLSearchParams ? init.body.toString() : "",
    headers: Array.from(headers.entries()),
    method: init?.method ?? request?.method ?? "GET",
    url: input instanceof Request ? input.url : String(input),
  }
}

async function providerResponses(options: {
  idToken: string
  authMethods?: string[]
  userInfo?: Record<string, unknown>
}): Promise<FetchCall[]> {
  const calls: FetchCall[] = []
  const jwk = await exportJWK(keyPair.publicKey)
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = fetchCallRead(input, init)
      calls.push(call)
      if (call.url === "https://idp.example/.well-known/openid-configuration")
        return new Response(
          JSON.stringify({
            issuer: "https://idp.example",
            authorization_endpoint: "https://idp.example/authorize",
            token_endpoint: "https://idp.example/token",
            userinfo_endpoint: "https://idp.example/userinfo",
            jwks_uri: "https://idp.example/jwks",
            token_endpoint_auth_methods_supported: options.authMethods,
          }),
          { headers: { "content-type": "application/json" } },
        )
      if (call.url === "https://idp.example/token")
        return new Response(
          JSON.stringify({
            access_token: "opaque-access",
            refresh_token: "opaque-refresh",
            expires_in: 3_600,
            id_token: options.idToken,
          }),
          { headers: { "content-type": "application/json" } },
        )
      if (call.url === "https://idp.example/jwks")
        return new Response(JSON.stringify({ keys: [{ ...jwk, kid: "provider-key", alg: "RS256", use: "sig" }] }), {
          headers: { "content-type": "application/json" },
        })
      if (call.url === "https://idp.example/userinfo")
        return new Response(JSON.stringify(options.userInfo ?? {}), { headers: { "content-type": "application/json" } })
      return new Response("not found", { status: 404 })
    },
    { preconnect: originalFetch.preconnect },
  )
  return calls
}

function authCreate(nonce: string): IdentitySsoAuth {
  return {
    state: "state",
    clientChallenge: "client-challenge",
    nonce,
    redirectUri: "https://vault.example/sso-connector.html",
    codeResponse: "provider-code",
    codeResponseError: null,
    authResponse: null,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    bindingHash: null,
  }
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("SSO adapter builds the provider authorization request with exact redirects, scopes, PKCE, and extras", async () => {
  const calls = await providerResponses({ idToken: "unused" })
  const adapter = identitySsoAdapterCreate(
    identityConfigCreate({
      SSO_AUTHORITY: "https://idp.example/",
      SSO_CLIENT_ID: "client-id",
      SSO_CLIENT_SECRET: "client-secret",
      SSO_AUTHORIZE_EXTRA_PARAMS: "prompt=login&ui_locales=en",
    }),
    "https://vault.example/",
    clockTestCreate("2026-08-28T00:00:00.000Z"),
  )

  const result = await adapter.authorize({
    clientId: "web",
    rawRedirectUri: "ignored",
    redirectUri: "https://vault.example/sso-connector.html",
    state: "state-value",
    clientChallenge: "challenge-value",
  })
  expect(result.success).toBe(true)
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({
    method: "GET",
    url: "https://idp.example/.well-known/openid-configuration",
  })
  if (!result.success) return
  const authorizationUrl = new URL(result.data.authorizationUrl)
  expect(authorizationUrl.origin + authorizationUrl.pathname).toBe("https://idp.example/authorize")
  expect(authorizationUrl.searchParams.get("client_id")).toBe("client-id")
  expect(authorizationUrl.searchParams.get("redirect_uri")).toBe("https://vault.example/sso-connector.html")
  expect(authorizationUrl.searchParams.get("response_type")).toBe("code")
  expect(authorizationUrl.searchParams.get("scope")).toBe("openid email profile")
  expect(authorizationUrl.searchParams.get("state")).toBe(btoa("state-value"))
  expect(authorizationUrl.searchParams.get("nonce")).toBe(result.data.nonce)
  expect(authorizationUrl.searchParams.get("code_challenge")).toBe("challenge-value")
  expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256")
  expect(authorizationUrl.searchParams.get("prompt")).toBe("login")
  expect(authorizationUrl.searchParams.get("ui_locales")).toBe("en")
})

test("SSO adapter exchanges an authorization code using basic authentication and validates provider claims", async () => {
  const nonce = "provider-nonce"
  const idToken = await new SignJWT({
    email: "Alice@Example.COM",
    email_verified: true,
    nonce,
    preferred_username: "alice",
  })
    .setProtectedHeader({ typ: "JWT", alg: "RS256", kid: "provider-key" })
    .setIssuer("https://idp.example")
    .setAudience("client-id")
    .setSubject("subject-1")
    .setIssuedAt(1_787_875_200)
    .setExpirationTime(1_787_878_800)
    .sign(keyPair.privateKey)
  const calls = await providerResponses({ idToken, authMethods: ["client_secret_basic"] })
  const adapter = identitySsoAdapterCreate(
    identityConfigCreate({
      SSO_AUTHORITY: "https://idp.example",
      SSO_CLIENT_ID: "client-id",
      SSO_CLIENT_SECRET: "client-secret",
    }),
    "https://vault.example",
    clockTestCreate("2026-08-28T00:00:00.000Z"),
  )

  const result = await adapter.exchange({ auth: authCreate(nonce), code: "provider-code", codeVerifier: "verifier" })

  expect(result).toEqual({
    success: true,
    data: {
      refresh_token: "opaque-refresh",
      access_token: "opaque-access",
      expires_in: 3_600,
      identifier: "https://idp.example/subject-1",
      email: "alice@example.com",
      email_verified: true,
      user_name: "alice",
    },
  })
  expect(calls.map((call) => call.url)).toEqual([
    "https://idp.example/.well-known/openid-configuration",
    "https://idp.example/token",
    "https://idp.example/jwks",
    "https://idp.example/userinfo",
  ])
  expect(calls[1]?.method).toBe("POST")
  expect(calls[1]?.headers).toContainEqual(["authorization", `Basic ${btoa("client-id:client-secret")}`])
  expect(calls[1]?.headers).toContainEqual(["content-type", "application/x-www-form-urlencoded"])
  expect(calls[1]?.body).toBe(
    "code=provider-code&grant_type=authorization_code&redirect_uri=https%3A%2F%2Fvault.example%2Fsso-connector.html&code_verifier=verifier",
  )
})

test("SSO adapter supports client-secret-post and userinfo fallback while rejecting bad provider metadata and nonce", async () => {
  const nonce = "provider-nonce"
  const idToken = await new SignJWT({ nonce: "wrong-nonce" })
    .setProtectedHeader({ typ: "JWT", alg: "RS256", kid: "provider-key" })
    .setIssuer("https://idp.example")
    .setAudience("client-id")
    .setIssuedAt(1_787_875_200)
    .setExpirationTime(1_787_878_800)
    .sign(keyPair.privateKey)
  const calls = await providerResponses({
    idToken,
    authMethods: ["client_secret_post"],
    userInfo: { email: "Info@Example.COM", email_verified: false, preferred_username: "info" },
  })
  const adapter = identitySsoAdapterCreate(
    identityConfigCreate({
      SSO_AUTHORITY: "https://idp.example",
      SSO_CLIENT_ID: "client-id",
      SSO_CLIENT_SECRET: "client-secret",
    }),
    "https://vault.example",
    clockTestCreate("2026-08-28T00:00:00.000Z"),
  )
  const result = await adapter.exchange({ auth: authCreate(nonce), code: "provider-code", codeVerifier: "verifier" })
  expect(result).toMatchObject({ success: false, errorMessage: "Could not read id_token claims" })
  expect(calls[1]?.headers).toContainEqual(["content-type", "application/x-www-form-urlencoded"])

  globalThis.fetch = Object.assign(
    async () => new Response(JSON.stringify({ authorization_endpoint: "missing" }), { status: 200 }),
    { preconnect: originalFetch.preconnect },
  )
  const malformed = await adapter.authorize({
    clientId: "web",
    rawRedirectUri: "ignored",
    redirectUri: "https://vault.example/sso-connector.html",
    state: "state",
    clientChallenge: "challenge",
  })
  expect(malformed).toMatchObject({ success: false, errorMessage: "Failed to discover OpenID provider" })
})

test("SSO adapter exchanges provider refresh tokens and validates opaque access tokens through userinfo", async () => {
  const calls = await providerResponses({ idToken: "unused" })
  const adapter = identitySsoAdapterCreate(
    identityConfigCreate({
      SSO_AUTHORITY: "https://idp.example",
      SSO_CLIENT_ID: "client-id",
      SSO_CLIENT_SECRET: "client-secret",
    }),
    "https://vault.example",
    clockTestCreate("2026-08-28T00:00:00.000Z"),
  )
  if (adapter.refresh === undefined || adapter.validateAccessToken === undefined) return

  const refreshResult = await adapter.refresh("opaque-refresh")
  expect(refreshResult).toEqual({
    success: true,
    data: { access_token: "opaque-access", refresh_token: "opaque-refresh", expires_in: 3_600 },
  })
  const validationResult = await adapter.validateAccessToken("opaque-access")
  expect(validationResult).toMatchObject({ success: true, data: undefined })
  expect(calls.map((call) => call.url)).toEqual([
    "https://idp.example/.well-known/openid-configuration",
    "https://idp.example/token",
    "https://idp.example/.well-known/openid-configuration",
    "https://idp.example/userinfo",
  ])
  expect(calls[1]?.body).toBe("grant_type=refresh_token&refresh_token=opaque-refresh")
  expect(calls[1]?.headers).toContainEqual(["authorization", `Basic ${btoa("client-id:client-secret")}`])
  expect(calls[3]?.headers).toContainEqual(["authorization", "Bearer opaque-access"])
})
