import { describe, expect, test } from "bun:test"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { type WebAuthStorageAdapter, webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { webAuthTokenEmailResolve } from "../../../src/web/auth/model/webAuthTokenEmailResolve.js"

function memoryStorageCreate(): WebAuthStorageAdapter {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

function jwtTokenCreate(claims: Record<string, unknown>): string {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  return `${header}.${payload}.mock-signature`
}

function validSsoTokenResponseCreate(
  overrides: Partial<BitwardenPasswordTokenResponse> = {},
): BitwardenPasswordTokenResponse {
  const accessToken = jwtTokenCreate({
    sub: "user-sso-uuid-1234",
    email: "sso-user@example.com",
    iss: "https://vault.example|login",
  })

  return {
    access_token: accessToken,
    expires_in: 3600,
    token_type: "Bearer",
    refresh_token: "mock-refresh-token",
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
        MasterKeyEncryptedUserKey: "2.encrypted-user-key-payload==",
        MasterKeyWrappedUserKey: "wrapped-key",
        Salt: "salt==",
      },
      Object: "userDecryptionOptions",
    },
    ...overrides,
  }
}

describe("webAuthTokenEmailResolve", () => {
  test("resolves and normalizes valid email from JWT access token payload", () => {
    const token = jwtTokenCreate({ sub: "user-1", email: " Alice@EXAMPLE.com " })
    expect(webAuthTokenEmailResolve(token)).toBe("alice@example.com")
  })

  test("returns null for missing email, empty email, or invalid tokens", () => {
    expect(webAuthTokenEmailResolve(jwtTokenCreate({ sub: "user-1" }))).toBeNull()
    expect(webAuthTokenEmailResolve(jwtTokenCreate({ sub: "user-1", email: "   " }))).toBeNull()
    expect(webAuthTokenEmailResolve("not-a-valid-jwt")).toBeNull()
    expect(webAuthTokenEmailResolve("")).toBeNull()
  })
})

describe("webAuthSessionCreate ssoSessionAccept", () => {
  test("accepts existing user SSO token, sets locked state, and persists session", () => {
    const memory = memoryStorageCreate()
    const storage = webAuthStorageCreate(memory)
    const session = webAuthSessionCreate({ storage })

    expect(session.isUnauthenticated()).toBe(true)
    expect(session.isLocked()).toBe(false)
    expect(session.session()).toBeNull()

    const tokenResponse = validSsoTokenResponseCreate()
    const result = session.ssoSessionAccept(tokenResponse)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.email).toBe("sso-user@example.com")
    expect(result.data.userId).toBe("user-sso-uuid-1234")
    expect(result.data.encryptedUserKey).toBe("2.encrypted-user-key-payload==")
    expect(result.data.tokenType).toBe("Bearer")
    expect(result.data.kdf).toBe(0)
    expect(result.data.kdfIterations).toBe(600_000)

    // Session state signals are locked
    expect(session.isLocked()).toBe(true)
    expect(session.isUnlocked()).toBe(false)
    expect(session.isUnauthenticated()).toBe(false)
    expect(session.session()?.email).toBe("sso-user@example.com")

    // Persisted to storage
    const loaded = storage.sessionLoad()
    expect(loaded.success).toBe(true)
    if (loaded.success) {
      expect(loaded.data?.email).toBe("sso-user@example.com")
      expect(loaded.data?.encryptedUserKey).toBe("2.encrypted-user-key-payload==")
    }
  })

  test("rejects when HasMasterPassword is false and does not persist session", () => {
    const memory = memoryStorageCreate()
    const storage = webAuthStorageCreate(memory)
    const session = webAuthSessionCreate({ storage })

    const tokenResponse = validSsoTokenResponseCreate({
      UserDecryptionOptions: {
        HasMasterPassword: false,
        MasterPasswordUnlock: null,
        Object: "userDecryptionOptions",
      },
    })

    const result = session.ssoSessionAccept(tokenResponse)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.code).toBe("auth.master-password-setup-required")
      expect(result.errorMessage).toContain("setup is required")
    }

    // Session remains unauthenticated and storage is empty
    expect(session.isUnauthenticated()).toBe(true)
    expect(session.session()).toBeNull()
    expect(storage.sessionLoad().data).toBeNull()
  })

  test("rejects when access token has missing or invalid email", () => {
    const memory = memoryStorageCreate()
    const storage = webAuthStorageCreate(memory)
    const session = webAuthSessionCreate({ storage })

    const invalidAccessToken = jwtTokenCreate({ sub: "user-no-email" })
    const tokenResponse = validSsoTokenResponseCreate({ access_token: invalidAccessToken })

    const result = session.ssoSessionAccept(tokenResponse)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorMessage).toContain("email")
    }
    expect(session.isUnauthenticated()).toBe(true)
    expect(storage.sessionLoad().data).toBeNull()
  })

  test("rejects when encrypted user key is missing", () => {
    const memory = memoryStorageCreate()
    const storage = webAuthStorageCreate(memory)
    const session = webAuthSessionCreate({ storage })

    const tokenResponse = validSsoTokenResponseCreate({
      Key: undefined,
      UserDecryptionOptions: {
        HasMasterPassword: true,
        MasterPasswordUnlock: null,
        Object: "userDecryptionOptions",
      },
    })

    const result = session.ssoSessionAccept(tokenResponse)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errorMessage).toContain("encrypted user key")
    }
    expect(session.isUnauthenticated()).toBe(true)
    expect(storage.sessionLoad().data).toBeNull()
  })
})
