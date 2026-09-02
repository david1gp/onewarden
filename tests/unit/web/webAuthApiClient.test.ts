import { expect, test } from "bun:test"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"

test("webAuthApiClient makes prelogin, login, registration, and email verification calls", async () => {
  const requests: Array<{ url: string; method: string; body: string }> = []

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const method = init?.method ?? "GET"
    const body = String(init?.body ?? "")
    requests.push({ url, method, body })

    if (url.endsWith("/identity/accounts/prelogin")) {
      return new Response(
        JSON.stringify({
          kdf: 0,
          kdfIterations: 600_000,
          kdfMemory: null,
          kdfParallelism: null,
          kdfSettings: { iterations: 600_000, kdfType: 0, memory: null, parallelism: null },
          salt: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/identity/connect/token")) {
      return new Response(
        JSON.stringify({
          access_token: "header.eyJzdWIiOiJ1c2VyLTEyMyJ9.sig",
          expires_in: 3600,
          token_type: "Bearer",
          refresh_token: "refresh-xyz",
          PrivateKey: null,
          Kdf: 0,
          KdfIterations: 600_000,
          KdfMemory: null,
          KdfParallelism: null,
          ResetMasterPassword: false,
          ForcePasswordReset: false,
          MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
          scope: "api offline_access",
          AccountKeys: null,
          UserDecryptionOptions: {
            HasMasterPassword: true,
            MasterPasswordUnlock: {
              Kdf: { KdfType: 0, Iterations: 600_000, Memory: null, Parallelism: null },
              MasterKeyEncryptedUserKey: "2.iv|ciphertext|mac",
              MasterKeyWrappedUserKey: "2.iv|ciphertext|mac",
              Salt: "user@example.com",
            },
            Object: "userDecryptionOptions",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/identity/accounts/register")) {
      return new Response(JSON.stringify({ object: "register", captchaBypassToken: "" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    if (url.endsWith("/identity/accounts/register/send-verification-email")) {
      return new Response(JSON.stringify("sample-verification-token"), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    if (url.endsWith("/api/accounts/verify-email-token")) {
      return new Response(null, { status: 200 })
    }

    return new Response("Not found", { status: 404 })
  }

  const client = webAuthApiClientCreate({ fetch: fakeFetch })

  const prelogin = await client.prelogin("user@example.com")
  expect(prelogin.success).toBe(true)

  const login = await client.login({ username: " User@Example.COM ", passwordHashB64: "hash123", twoFactorProvider: 5 })
  expect(login.success).toBe(true)

  const register = await client.register({
    email: " User@Example.COM ",
    masterPasswordHash: "hash123",
    userSymmetricKey: "2.iv|ciphertext|mac",
  })
  expect(register.success).toBe(true)

  const sendVerify = await client.sendVerificationEmail({ email: "user@example.com" })
  expect(sendVerify.success).toBe(true)

  const verifyToken = await client.verifyEmailToken({ userId: "user-123", token: "sample-token" })
  expect(verifyToken.success).toBe(true)

  const loginRequest = requests.find((request) => request.url.endsWith("/identity/connect/token"))
  if (!loginRequest) throw new Error("Login request was not captured.")
  expect(Object.fromEntries(new URLSearchParams(loginRequest.body))).toEqual({
    grant_type: "password",
    username: "user@example.com",
    password: "hash123",
    client_id: "web",
    device_identifier: "web-browser",
    device_name: "Web Browser",
    device_type: "6",
    scope: "api offline_access",
    two_factor_provider: "5",
  })

  const registerRequest = requests.find((request) => request.url.endsWith("/identity/accounts/register"))
  if (!registerRequest) throw new Error("Register request was not captured.")
  expect(JSON.parse(registerRequest.body)).toEqual({
    email: "user@example.com",
    masterPasswordHash: "hash123",
    key: "2.iv|ciphertext|mac",
    masterPasswordHint: null,
    name: null,
    kdf: 0,
    kdfIterations: 600_000,
    kdfMemory: null,
    kdfParallelism: null,
    keys: null,
  })

  expect(requests).toHaveLength(5)
})

test("webAuthApiClient rejects invalid JSON and invalid two-factor challenge responses", async () => {
  let responseBody = "not-json"
  let responseStatus = 200
  const client = webAuthApiClientCreate({
    fetch: async () => new Response(responseBody, { status: responseStatus }),
  })

  const invalidJson = await client.prelogin("user@example.com")
  expect(invalidJson).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })

  responseBody = JSON.stringify({ error: "invalid_grant", TwoFactorProviders: "not-an-array" })
  responseStatus = 400
  const invalidChallenge = await client.login({ username: "user@example.com", passwordHashB64: "hash123" })
  expect(invalidChallenge).toMatchObject({ success: false, statusCode: 400 })
  if (!invalidChallenge.success) expect(invalidChallenge.code).not.toBe("auth.two-factor-required")
})

test("webAuthApiClient rejects invalid request inputs before making requests", async () => {
  let requestCount = 0
  const client = webAuthApiClientCreate({
    fetch: async () => {
      requestCount += 1
      return new Response(null, { status: 204 })
    },
  })

  const invalidLogin = await client.login({
    username: "user@example.com",
    passwordHashB64: 123 as unknown as string,
  })
  expect(invalidLogin).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })

  const invalidVerification = await client.verifyEmailToken({ userId: "user-123", token: null as unknown as string })
  expect(invalidVerification).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })
  expect(requestCount).toBe(0)
})

test("webAuthApiClient refreshes an access token with the persisted refresh token", async () => {
  let requestBody = ""
  const client = webAuthApiClientCreate({
    fetch: async (_input, init) => {
      requestBody = String(init?.body ?? "")
      return new Response(
        JSON.stringify({
          refresh_token: "refreshed-token",
          access_token: "refreshed-access-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "api offline_access",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    },
  })

  const result = await client.refreshToken({
    grant_type: "refresh_token",
    refresh_token: "persisted-refresh-token",
    client_id: "web",
  })

  expect(result.success).toBe(true)
  expect(Object.fromEntries(new URLSearchParams(requestBody))).toEqual({
    grant_type: "refresh_token",
    refresh_token: "persisted-refresh-token",
    client_id: "web",
  })
})

test("webAuthApiClient rejects malformed refresh-token responses", async () => {
  let responseBody: Record<string, unknown> = {
    refresh_token: "refreshed-token",
    access_token: "refreshed-access-token",
    expires_in: 3600,
    token_type: "Bearer",
    scope: "api offline_access",
  }
  const client = webAuthApiClientCreate({
    fetch: async () => new Response(JSON.stringify(responseBody), { status: 200 }),
  })
  const malformedResponses = [
    { access_token: "" },
    { refresh_token: "" },
    { expires_in: 0 },
    { expires_in: -1 },
    { expires_in: Number.MAX_SAFE_INTEGER + 1 },
  ]

  for (const malformedResponse of malformedResponses) {
    responseBody = {
      refresh_token: "refreshed-token",
      access_token: "refreshed-access-token",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "api offline_access",
      ...malformedResponse,
    }
    const result = await client.refreshToken({
      grant_type: "refresh_token",
      refresh_token: "persisted-refresh-token",
      client_id: "web",
    })

    expect(result).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })
  }
})
