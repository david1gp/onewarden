import { expect, test } from "bun:test"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { type WebAuthStorageAdapter, webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { webAuthUserKeysGenerate } from "../../../src/web/auth/model/webAuthUserKeysGenerate.js"

const oldSession = {
  email: "old@example.com",
  accessToken: "old-access-token",
  refreshToken: "old-refresh-token",
  tokenType: "Bearer" as const,
  expiresAt: Date.now() + 3600_000,
  userId: "old-user",
  kdf: 0,
  kdfIterations: 1_000,
  kdfMemory: null,
  kdfParallelism: null,
  encryptedUserKey: "old-wrapped-key",
}

function failingStorageCreate(
  extraValues: Record<string, string> = {},
  includeExistingSession = true,
): WebAuthStorageAdapter {
  const values = new Map<string, string>([
    ...(includeExistingSession ? [["onewarden_web_auth_session", JSON.stringify(oldSession)]] : []),
    ...Object.entries(extraValues),
  ])
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: () => {
      throw new Error("localStorage unavailable")
    },
    removeItem: (key) => values.delete(key),
  }
}

function jwtTokenCreate(): string {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ sub: "new-user", email: "new@example.com" })),
  )
  return `${header}.${payload}.mock-signature`
}

function tokenResponseCreate(encryptedUserKey: string): BitwardenPasswordTokenResponse {
  return {
    access_token: jwtTokenCreate(),
    expires_in: 3600,
    token_type: "Bearer",
    refresh_token: "new-refresh-token",
    PrivateKey: null,
    Kdf: 0,
    KdfIterations: 1_000,
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
        Kdf: { KdfType: 0, Iterations: 1_000, Memory: null, Parallelism: null },
        MasterKeyEncryptedUserKey: encryptedUserKey,
        MasterKeyWrappedUserKey: encryptedUserKey,
        Salt: "new@example.com",
      },
      Object: "userDecryptionOptions",
    },
  }
}

async function loginHarnessCreate(
  options: { rememberedToken?: string; twoFactor?: boolean; includeExistingSession?: boolean } = {},
) {
  const email = "new@example.com"
  const password = "NewMasterPassword123!"
  const keysResult = await webAuthUserKeysGenerate(password, email, {
    kdfType: 0,
    iterations: 1_000,
    memory: null,
    parallelism: null,
  })
  if (!keysResult.success) throw new Error(keysResult.errorMessage)

  let loginCalls = 0
  const apiClient = webAuthApiClientCreate({
    fetch: async (input, init) => {
      const url = String(input)
      const body = String(init?.body ?? "")
      if (url.endsWith("/identity/accounts/prelogin")) {
        return Response.json({
          kdf: 0,
          kdfIterations: 1_000,
          kdfMemory: null,
          kdfParallelism: null,
          kdfSettings: { iterations: 1_000, kdfType: 0, memory: null, parallelism: null },
          salt: null,
        })
      }
      if (url.endsWith("/identity/connect/token")) {
        loginCalls += 1
        if (options.twoFactor && !body.includes("two_factor_provider=0")) {
          return new Response(
            JSON.stringify({
              error: "invalid_grant",
              error_description: "Two factor required.",
              TwoFactorProviders: ["0"],
              TwoFactorProviders2: { "0": null },
            }),
            { status: 400, headers: { "content-type": "application/json" } },
          )
        }
        return Response.json(tokenResponseCreate(keysResult.data.wrappedUserKey))
      }
      return new Response("Not found", { status: 404 })
    },
  })
  const storage = webAuthStorageCreate(
    failingStorageCreate(
      options.rememberedToken === undefined ? {} : { [`onewarden_web_2fa_remember_${email}`]: options.rememberedToken },
      options.includeExistingSession,
    ),
  )
  const session = webAuthSessionCreate({ storage, apiClient })
  return { email, password, loginCalls: () => loginCalls, session, storage }
}

test("password login reports session persistence failure and keeps the older session", async () => {
  const harness = await loginHarnessCreate()

  const result = await harness.session.login({
    email: harness.email,
    masterPassword: harness.password,
  })

  expect(result.success).toBe(false)
  expect(harness.session.session()).toEqual(oldSession)
  expect(harness.session.status()).toBe("locked")
  expect(harness.session.getUserKey()).toBeNull()
  expect(harness.storage.sessionLoad()).toEqual({ success: true, data: oldSession })
})

test("password login does not establish an in-memory session when persistence fails", async () => {
  const harness = await loginHarnessCreate({ includeExistingSession: false })

  const result = await harness.session.login({
    email: harness.email,
    masterPassword: harness.password,
  })

  expect(result.success).toBe(false)
  expect(harness.session.session()).toBeNull()
  expect(harness.session.status()).toBe("unauthenticated")
  expect(harness.session.getUserKey()).toBeNull()
  expect(harness.storage.sessionLoad()).toEqual({ success: true, data: null })
})

test("remembered-device login reports session persistence failure without falling back", async () => {
  const harness = await loginHarnessCreate({ rememberedToken: "remembered-token" })

  const result = await harness.session.login({
    email: harness.email,
    masterPassword: harness.password,
  })

  expect(result.success).toBe(false)
  expect(harness.session.session()).toEqual(oldSession)
  expect(harness.session.status()).toBe("locked")
  expect(harness.loginCalls()).toBe(1)
  expect(harness.storage.sessionLoad()).toEqual({ success: true, data: oldSession })
})

test("two-factor login reports session persistence failure and leaves its challenge active", async () => {
  const harness = await loginHarnessCreate({ twoFactor: true })

  const initialResult = await harness.session.login({
    email: harness.email,
    masterPassword: harness.password,
  })
  expect(initialResult.success).toBe(false)
  expect(harness.session.pendingTwoFactor()).not.toBeNull()

  const result = await harness.session.loginTwoFactor({ provider: 0, token: "123456" })

  expect(result.success).toBe(false)
  expect(harness.session.session()).toEqual(oldSession)
  expect(harness.session.status()).toBe("locked")
  expect(harness.session.pendingTwoFactor()).not.toBeNull()
  expect(harness.storage.sessionLoad()).toEqual({ success: true, data: oldSession })
})

test("SSO session acceptance reports persistence failure and keeps the older session", () => {
  const storage = webAuthStorageCreate(failingStorageCreate())
  const session = webAuthSessionCreate({ storage })

  const result = session.ssoSessionAccept(tokenResponseCreate("new-wrapped-key"))

  expect(result.success).toBe(false)
  expect(session.session()).toEqual(oldSession)
  expect(session.status()).toBe("locked")
  expect(storage.sessionLoad()).toEqual({ success: true, data: oldSession })
})

test("SSO first-login setup reports persistence failure and keeps the older session", async () => {
  const storage = webAuthStorageCreate(failingStorageCreate())
  const apiClient = webAuthApiClientCreate({
    fetch: async () => Response.json({ object: "set-password" }),
  })
  const session = webAuthSessionCreate({ storage, apiClient })

  const result = await session.ssoMasterPasswordSetup({
    email: "new@example.com",
    userId: "new-user",
    accessToken: "new-access-token",
    refreshToken: "new-refresh-token",
    tokenExpiresAt: Date.now() + 3600_000,
    kdf: 0,
    kdfIterations: 1_000,
    kdfMemory: null,
    kdfParallelism: null,
    masterPassword: "NewMasterPassword123!",
  })

  expect(result.success).toBe(false)
  expect(session.session()).toEqual(oldSession)
  expect(session.status()).toBe("locked")
  expect(session.getUserKey()).toBeNull()
  expect(storage.sessionLoad()).toEqual({ success: true, data: oldSession })
})

test("session handoff acceptance reports persistence failure and keeps the older session", () => {
  const storage = webAuthStorageCreate(failingStorageCreate())
  const session = webAuthSessionCreate({ storage })

  const result = session.sessionHandoffAccept(
    {
      operation: "create",
      cipherId: null,
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600,
      email: "new@example.com",
      userId: "new-user",
      kdf: 0,
      kdfIterations: 1_000,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: "new-wrapped-key",
      userKeyTransfer: { algorithm: "AES-GCM", iv: "A".repeat(16), ciphertext: "A" },
    },
    new Uint8Array(64),
  )

  expect(result.success).toBe(false)
  expect(session.session()).toEqual(oldSession)
  expect(session.status()).toBe("locked")
  expect(storage.sessionLoad()).toEqual({ success: true, data: oldSession })
})
