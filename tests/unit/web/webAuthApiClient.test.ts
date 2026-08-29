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

  const login = await client.login({ username: "user@example.com", passwordHashB64: "hash123" })
  expect(login.success).toBe(true)

  const register = await client.register({
    email: "user@example.com",
    masterPasswordHash: "hash123",
    userSymmetricKey: "2.iv|ciphertext|mac",
  })
  expect(register.success).toBe(true)

  const sendVerify = await client.sendVerificationEmail({ email: "user@example.com" })
  expect(sendVerify.success).toBe(true)

  const verifyToken = await client.verifyEmailToken({ userId: "user-123", token: "sample-token" })
  expect(verifyToken.success).toBe(true)

  expect(requests).toHaveLength(5)
})
