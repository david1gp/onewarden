import { expect, test } from "bun:test"
import { base64Encode } from "../../../src/shared/crypto/base64Encode.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"
import { webSsoAuthorizationCreate } from "../../../src/web/sso/model/webSsoAuthorizationCreate.js"
import { webSsoCallbackPhaseResolve } from "../../../src/web/sso/model/webSsoCallbackPhaseResolve.js"
import { webSsoCodeChallengeCreate } from "../../../src/web/sso/model/webSsoCodeChallengeCreate.js"
import { webSsoTransactionStorageCreate } from "../../../src/web/sso/model/webSsoTransactionStorageCreate.js"

const nowMs = Date.parse("2026-09-01T12:00:00.000Z")

function storageAdapterCreate() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}

function tokenCreate(claims: unknown): string {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  return `header.${payload}.signature`
}

function ssoTokenResponse(accessToken: string) {
  return {
    access_token: accessToken,
    expires_in: 3_600,
    token_type: "Bearer" as const,
    refresh_token: "refresh-token",
    PrivateKey: null,
    Kdf: 0,
    KdfIterations: 600_000,
    KdfMemory: null,
    KdfParallelism: null,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    MasterPasswordPolicy: { Object: "masterPasswordPolicy" as const },
    scope: "api offline_access",
    AccountKeys: null,
    UserDecryptionOptions: {
      HasMasterPassword: false,
      MasterPasswordUnlock: null,
      Object: "userDecryptionOptions" as const,
    },
  }
}

test("web SSO code challenge follows the RFC 7636 S256 vector", async () => {
  const result = await webSsoCodeChallengeCreate("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
  expect(result).toEqual({ success: true, data: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM" })
})

test("web SSO authorization creates an independent PKCE transaction and fixed same-origin URL", async () => {
  const result = await webSsoAuthorizationCreate({
    origin: "https://vault.example",
    nowMs,
    email: " User@Example.COM ",
    ssoToken: "provider-secret-that-must-not-be-forwarded",
  })
  expect(result.success).toBe(true)
  if (!result.success) return

  const url = new URL(result.data.authorizationUrl)
  expect(url.origin).toBe("https://vault.example")
  expect(url.pathname).toBe("/identity/connect/authorize")
  expect(url.searchParams.get("client_id")).toBe("web")
  expect(url.searchParams.get("redirect_uri")).toBe("https://vault.example/sso-connector.html")
  expect(url.searchParams.get("response_type")).toBe("code")
  expect(url.searchParams.get("scope")).toBe("api offline_access")
  expect(url.searchParams.get("code_challenge_method")).toBe("S256")
  expect(url.searchParams.has("ssoToken")).toBe(false)
  expect(result.data.transaction.state).not.toBe(result.data.transaction.codeVerifier)
  expect(result.data.transaction.expiresAt - result.data.transaction.createdAt).toBe(600_000)
  expect(result.data.transaction.email).toBe("user@example.com")

  const storage = webSsoTransactionStorageCreate(storageAdapterCreate())
  expect(storage.save(result.data.transaction).success).toBe(true)
  expect(storage.load(nowMs)).toEqual({ success: true, data: result.data.transaction })
})

test("web SSO callback restores backend state before authorization-code token exchange", async () => {
  const authorization = await webSsoAuthorizationCreate({ origin: "https://vault.example", nowMs })
  expect(authorization.success).toBe(true)
  if (!authorization.success) return
  const { transaction } = authorization.data

  const providerCallback = new URL("https://vault.example/identity/connect/oidc-signin")
  providerCallback.searchParams.set("code", "provider-code")
  providerCallback.searchParams.set("state", base64Encode(new TextEncoder().encode(transaction.state)))
  expect(providerCallback.pathname).toBe("/identity/connect/oidc-signin")
  expect(providerCallback.searchParams.get("state")).not.toBe(transaction.state)

  const backendRestoredCallback = new URL(transaction.redirectUri)
  backendRestoredCallback.searchParams.set("code", "provider-code")
  backendRestoredCallback.searchParams.set("state", transaction.state)
  backendRestoredCallback.searchParams.set("scope", "api offline_access")
  backendRestoredCallback.searchParams.set("iss", "https://vault.example")
  const callback = webSsoCallbackPhaseResolve({
    callbackUrl: backendRestoredCallback,
    origin: "https://vault.example",
    nowMs: nowMs + 1,
    transaction,
  })
  expect(callback).toMatchObject({ success: true, data: { phase: "code", code: "provider-code" } })
  if (!callback.success) return

  const requests: Array<{ url: string; init: RequestInit | undefined }> = []
  const client = webAuthApiClientCreate({
    fetch: async (input, init) => {
      requests.push({ url: String(input), init })
      return Response.json(ssoTokenResponse("access-token"))
    },
  })
  const token = await client.ssoLogin({
    code: callback.data.code,
    codeVerifier: callback.data.transaction.codeVerifier,
  })
  expect(token.success).toBe(true)
  expect(requests[0]?.url).toBe("/identity/connect/token")

  const duplicate = webSsoCallbackPhaseResolve({
    callbackUrl: `https://vault.example/sso-connector.html?code=first&state=${transaction.state}&state=${transaction.state}`,
    origin: "https://vault.example",
    nowMs: nowMs + 1,
    transaction,
  })
  expect(duplicate).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })

  const mismatch = webSsoCallbackPhaseResolve({
    callbackUrl: "https://vault.example/sso-connector.html?code=authorization-code&state=wrong-state",
    origin: "https://vault.example",
    nowMs: nowMs + 1,
    transaction,
  })
  expect(mismatch).toMatchObject({ success: false, code: "platform.unauthorized", statusCode: 401 })
})

test("web SSO provider errors reach token exchange through the restored callback code", async () => {
  const authorization = await webSsoAuthorizationCreate({ origin: "https://vault.example", nowMs })
  expect(authorization.success).toBe(true)
  if (!authorization.success) return
  const { transaction } = authorization.data
  const providerState = base64Encode(new TextEncoder().encode(transaction.state))

  const providerCallback = new URL("https://vault.example/identity/connect/oidc-signin")
  providerCallback.searchParams.set("error", "access_denied")
  providerCallback.searchParams.set("error_description", "Cancelled")
  providerCallback.searchParams.set("state", providerState)
  expect(providerCallback.pathname).toBe("/identity/connect/oidc-signin")

  const backendRestoredCallback = new URL(transaction.redirectUri)
  backendRestoredCallback.searchParams.set("code", providerState)
  backendRestoredCallback.searchParams.set("state", transaction.state)
  backendRestoredCallback.searchParams.set("scope", "api offline_access")
  backendRestoredCallback.searchParams.set("iss", "https://vault.example")
  const callback = webSsoCallbackPhaseResolve({
    callbackUrl: backendRestoredCallback,
    origin: "https://vault.example",
    nowMs: nowMs + 1,
    transaction,
  })
  expect(callback).toMatchObject({ success: true, data: { phase: "code", code: providerState } })
  if (!callback.success) return

  const requests: string[] = []
  const client = webAuthApiClientCreate({
    fetch: async (input) => {
      requests.push(String(input))
      return Response.json({ error: "SSO authorization failed: access_denied, Cancelled" }, { status: 400 })
    },
  })
  const token = await client.ssoLogin({ code: callback.data.code, codeVerifier: transaction.codeVerifier })
  expect(token.success).toBe(false)
  expect(requests).toEqual(["/identity/connect/token"])
})

test("web SSO storage fails closed when session storage is unavailable", () => {
  const storage = webSsoTransactionStorageCreate(null)
  expect(storage.save({} as never)).toMatchObject({ success: false, code: "platform.unavailable", statusCode: 503 })
  expect(storage.load(nowMs)).toMatchObject({ success: false, code: "platform.unavailable", statusCode: 503 })
  expect(storage.clear()).toMatchObject({ success: false, code: "platform.unavailable", statusCode: 503 })
})

test("web SSO callback rejects a transaction created in the future", async () => {
  const authorization = await webSsoAuthorizationCreate({ origin: "https://vault.example", nowMs: nowMs + 1_000 })
  expect(authorization.success).toBe(true)
  if (!authorization.success) return
  const callback = webSsoCallbackPhaseResolve({
    callbackUrl: `https://vault.example/sso-connector.html?code=authorization-code&state=${authorization.data.transaction.state}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`,
    origin: "https://vault.example",
    nowMs,
    transaction: authorization.data.transaction,
  })
  expect(callback).toMatchObject({ success: false, code: "platform.unauthorized", statusCode: 401 })
})

test("web auth API client makes the exact authorization-code token request", async () => {
  const requests: Array<{ url: string; init: RequestInit | undefined }> = []
  const response = ssoTokenResponse(tokenCreate({ sub: "user-123", email: "user@example.com" }))
  const client = webAuthApiClientCreate({
    fetch: async (input, init) => {
      requests.push({ url: String(input), init })
      return Response.json(response)
    },
  })

  const result = await client.ssoLogin({ code: "authorization-code", codeVerifier: "a".repeat(43) })
  expect(result.success).toBe(true)
  expect(requests).toHaveLength(1)
  const request = requests[0]
  if (request === undefined) return
  expect(request.url).toBe("/identity/connect/token")
  expect(request.init?.method).toBe("POST")
  expect(request.init?.headers).toEqual({
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  })
  expect(Object.fromEntries(new URLSearchParams(String(request.init?.body)))).toEqual({
    grant_type: "authorization_code",
    code: "authorization-code",
    code_verifier: "a".repeat(43),
    client_id: "web",
    device_identifier: "web-browser",
    device_name: "Web Browser",
    device_type: "6",
    scope: "api offline_access",
  })
})
