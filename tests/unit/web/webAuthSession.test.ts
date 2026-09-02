import { expect, test } from "bun:test"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { webAuthUserKeysGenerate } from "../../../src/web/auth/model/webAuthUserKeysGenerate.js"

test("webAuthSession handles login, lock, unlock, and logout lifecycle", async () => {
  const email = "bob@example.com"
  const password = "BobMasterPassword123!"
  const kdfMetadata = { kdfType: 0, iterations: 100_000, memory: null, parallelism: null }

  const generatedKeysResult = await webAuthUserKeysGenerate(password, email, kdfMetadata)
  expect(generatedKeysResult.success).toBe(true)
  if (!generatedKeysResult.success) return
  const wrappedUserKey = generatedKeysResult.data.wrappedUserKey

  const fakeFetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input)

    if (url.endsWith("/identity/accounts/prelogin")) {
      return new Response(
        JSON.stringify({
          kdf: 0,
          kdfIterations: 100_000,
          kdfMemory: null,
          kdfParallelism: null,
          kdfSettings: { iterations: 100_000, kdfType: 0, memory: null, parallelism: null },
          salt: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/identity/connect/token")) {
      return new Response(
        JSON.stringify({
          access_token: "header.eyJzdWIiOiJ1c2VyLWJvYiJ9.sig",
          expires_in: 3600,
          token_type: "Bearer",
          refresh_token: "refresh-token-bob",
          PrivateKey: null,
          Kdf: 0,
          KdfIterations: 100_000,
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
              Kdf: { KdfType: 0, Iterations: 100_000, Memory: null, Parallelism: null },
              MasterKeyEncryptedUserKey: wrappedUserKey,
              MasterKeyWrappedUserKey: wrappedUserKey,
              Salt: email,
            },
            Object: "userDecryptionOptions",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    return new Response("Not found", { status: 404 })
  }

  const storage = webAuthStorageCreate()
  const apiClient = webAuthApiClientCreate({ fetch: fakeFetch })
  const sessionManager = webAuthSessionCreate({ storage, apiClient })

  expect(sessionManager.status()).toBe("unauthenticated")
  expect(sessionManager.isUnauthenticated()).toBe(true)

  const loginResult = await sessionManager.login({
    email,
    masterPassword: password,
    rememberEmail: true,
  })
  expect(loginResult.success).toBe(true)
  expect(sessionManager.status()).toBe("unlocked")
  expect(sessionManager.isUnlocked()).toBe(true)
  expect(sessionManager.rememberedEmail()).toBe(email)
  expect(sessionManager.getUserKey()).not.toBeNull()

  // Lock
  sessionManager.lock()
  expect(sessionManager.status()).toBe("locked")
  expect(sessionManager.isLocked()).toBe(true)
  expect(sessionManager.getUserKey()).toBeNull()

  // Unlock with correct password
  const unlockResult = await sessionManager.unlock(password)
  expect(unlockResult.success).toBe(true)
  expect(sessionManager.status()).toBe("unlocked")
  expect(sessionManager.isUnlocked()).toBe(true)
  expect(sessionManager.getUserKey()).not.toBeNull()

  // Lock again & attempt unlock with wrong password
  sessionManager.lock()
  const wrongUnlockResult = await sessionManager.unlock("wrongPassword")
  expect(wrongUnlockResult.success).toBe(false)
  expect(sessionManager.status()).toBe("locked")

  // Logout
  sessionManager.logout()
  expect(sessionManager.status()).toBe("unauthenticated")
  expect(sessionManager.session()).toBeNull()
})

test("webAuthSession restores a near-expiry persisted session with a refresh token", async () => {
  const storedSession = {
    email: "bob@example.com",
    accessToken: "expired-access-token",
    refreshToken: "persisted-refresh-token",
    tokenType: "Bearer" as const,
    expiresAt: Date.now() + 60_000,
    userId: "user-bob",
    kdf: 0,
    kdfIterations: 100_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "wrapped-key",
  }
  const storageValues = new Map<string, string>([["onewarden_web_auth_session", JSON.stringify(storedSession)]])
  const storage = webAuthStorageCreate({
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: (key) => storageValues.delete(key),
  })
  const apiClient = webAuthApiClientCreate({
    fetch: async (_input, init) => {
      expect(Object.fromEntries(new URLSearchParams(String(init?.body ?? "")))).toEqual({
        grant_type: "refresh_token",
        refresh_token: "persisted-refresh-token",
        client_id: "web",
      })
      return new Response(
        JSON.stringify({
          refresh_token: "rotated-refresh-token",
          access_token: "rotated-access-token",
          expires_in: 3600,
          token_type: "Bearer",
          scope: "api offline_access",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    },
  })
  const sessionManager = webAuthSessionCreate({ storage, apiClient })

  const restoreResult = await sessionManager.restore()

  expect(restoreResult.success).toBe(true)
  expect(sessionManager.status()).toBe("locked")
  expect(sessionManager.session()).toMatchObject({
    accessToken: "rotated-access-token",
    refreshToken: "rotated-refresh-token",
  })
  expect(storage.sessionLoad()).toMatchObject({
    success: true,
    data: { accessToken: "rotated-access-token", refreshToken: "rotated-refresh-token" },
  })
})

test("webAuthSession does not persist a refresh response with an unsafe calculated expiration", async () => {
  const storedSession = {
    email: "bob@example.com",
    accessToken: "expired-access-token",
    refreshToken: "persisted-refresh-token",
    tokenType: "Bearer" as const,
    expiresAt: Date.now() - 1,
    userId: "user-bob",
    kdf: 0,
    kdfIterations: 100_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "wrapped-key",
  }
  const storageValues = new Map<string, string>([["onewarden_web_auth_session", JSON.stringify(storedSession)]])
  const storage = webAuthStorageCreate({
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: (key) => storageValues.delete(key),
  })
  const apiClient = webAuthApiClientCreate({
    fetch: async () =>
      new Response(
        JSON.stringify({
          refresh_token: "rotated-refresh-token",
          access_token: "rotated-access-token",
          expires_in: Number.MAX_SAFE_INTEGER,
          token_type: "Bearer",
          scope: "api offline_access",
        }),
        { status: 200 },
      ),
  })
  const sessionManager = webAuthSessionCreate({ storage, apiClient })

  const restoreResult = await sessionManager.restore()

  expect(restoreResult).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })
  expect(sessionManager.session()).toEqual(storedSession)
  expect(storage.sessionLoad()).toEqual({ success: true, data: storedSession })
})

test("webAuthSession clears a persisted session when refresh credentials are rejected", async () => {
  const storageValues = new Map<string, string>([
    [
      "onewarden_web_auth_session",
      JSON.stringify({
        email: "bob@example.com",
        accessToken: "expired-access-token",
        refreshToken: "invalid-refresh-token",
        tokenType: "Bearer",
        expiresAt: Date.now() - 1,
        userId: "user-bob",
        kdf: 0,
        kdfIterations: 100_000,
        kdfMemory: null,
        kdfParallelism: null,
        encryptedUserKey: "wrapped-key",
      }),
    ],
  ])
  const storage = webAuthStorageCreate({
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: (key) => storageValues.delete(key),
  })
  const apiClient = webAuthApiClientCreate({
    fetch: async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
  })
  const sessionManager = webAuthSessionCreate({ storage, apiClient })

  const restoreResult = await sessionManager.restore()

  expect(restoreResult.success).toBe(false)
  expect(sessionManager.status()).toBe("unauthenticated")
  expect(sessionManager.session()).toBeNull()
  expect(storage.sessionLoad()).toEqual({ success: true, data: null })
})

test("webAuthSession coalesces concurrent refreshes for the same session", async () => {
  const storedSession = {
    email: "bob@example.com",
    accessToken: "expired-access-token",
    refreshToken: "persisted-refresh-token",
    tokenType: "Bearer" as const,
    expiresAt: Date.now() - 1,
    userId: "user-bob",
    kdf: 0,
    kdfIterations: 100_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "wrapped-key",
  }
  const storageValues = new Map<string, string>([["onewarden_web_auth_session", JSON.stringify(storedSession)]])
  const storage = webAuthStorageCreate({
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: (key) => storageValues.delete(key),
  })
  let refreshCalls = 0
  let refreshResolve!: (response: Response) => void
  const refreshResponse = new Promise<Response>((resolve) => {
    refreshResolve = resolve
  })
  const apiClient = webAuthApiClientCreate({
    fetch: async () => {
      refreshCalls += 1
      return refreshResponse
    },
  })
  const sessionManager = webAuthSessionCreate({ storage, apiClient })

  const firstRestore = sessionManager.restore()
  const secondRestore = sessionManager.restore()

  expect(refreshCalls).toBe(1)
  refreshResolve(
    new Response(
      JSON.stringify({
        refresh_token: "rotated-refresh-token",
        access_token: "rotated-access-token",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "api offline_access",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  )

  const [firstResult, secondResult] = await Promise.all([firstRestore, secondRestore])
  expect(firstResult).toEqual(secondResult)
  expect(sessionManager.session()).toMatchObject({
    accessToken: "rotated-access-token",
    refreshToken: "rotated-refresh-token",
  })
})

test("webAuthSession preserves the persisted session when refresh is unavailable", async () => {
  const storedSession = {
    email: "bob@example.com",
    accessToken: "expired-access-token",
    refreshToken: "persisted-refresh-token",
    tokenType: "Bearer" as const,
    expiresAt: Date.now() - 1,
    userId: "user-bob",
    kdf: 0,
    kdfIterations: 100_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "wrapped-key",
  }
  const storageValues = new Map<string, string>([["onewarden_web_auth_session", JSON.stringify(storedSession)]])
  const storage = webAuthStorageCreate({
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: (key) => storageValues.delete(key),
  })
  const apiClient = webAuthApiClientCreate({
    fetch: async () =>
      new Response(JSON.stringify({ message: "Identity database is unavailable." }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
  })
  const sessionManager = webAuthSessionCreate({ storage, apiClient })

  const restoreResult = await sessionManager.restore()

  expect(restoreResult).toMatchObject({ success: false, statusCode: 503 })
  expect(sessionManager.status()).toBe("locked")
  expect(sessionManager.session()).toMatchObject(storedSession)
  expect(storage.sessionLoad()).toMatchObject({ success: true, data: storedSession })
})

test("webAuthSession does not overwrite a newer persisted session after refresh", async () => {
  const storedSession = {
    email: "bob@example.com",
    accessToken: "expired-access-token",
    refreshToken: "persisted-refresh-token",
    tokenType: "Bearer" as const,
    expiresAt: Date.now() - 1,
    userId: "user-bob",
    kdf: 0,
    kdfIterations: 100_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "wrapped-key",
  }
  const storageValues = new Map<string, string>([["onewarden_web_auth_session", JSON.stringify(storedSession)]])
  const storage = webAuthStorageCreate({
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: (key) => storageValues.delete(key),
  })
  let refreshResolve!: (response: Response) => void
  const refreshResponse = new Promise<Response>((resolve) => {
    refreshResolve = resolve
  })
  const apiClient = webAuthApiClientCreate({ fetch: async () => refreshResponse })
  const sessionManager = webAuthSessionCreate({ storage, apiClient })

  const restorePromise = sessionManager.restore()
  const newerSession = { ...storedSession, accessToken: "new-access-token", refreshToken: "new-refresh-token" }
  storageValues.set("onewarden_web_auth_session", JSON.stringify(newerSession))
  refreshResolve(
    new Response(
      JSON.stringify({
        refresh_token: "rotated-refresh-token",
        access_token: "rotated-access-token",
        expires_in: 3600,
        token_type: "Bearer",
        scope: "api offline_access",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  )

  expect(await restorePromise).toEqual({ success: true, data: storedSession })
  expect(storage.sessionLoad()).toMatchObject({
    success: true,
    data: { accessToken: "new-access-token", refreshToken: "new-refresh-token" },
  })
  expect(sessionManager.session()).toEqual(storedSession)
})

test("webAuthSession does not invalidate a newer session after a rejected refresh", async () => {
  const storedSession = {
    email: "bob@example.com",
    accessToken: "expired-access-token",
    refreshToken: "persisted-refresh-token",
    tokenType: "Bearer" as const,
    expiresAt: Date.now() - 1,
    userId: "user-bob",
    kdf: 0,
    kdfIterations: 100_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "wrapped-key",
  }
  const storageValues = new Map<string, string>([["onewarden_web_auth_session", JSON.stringify(storedSession)]])
  const storage = webAuthStorageCreate({
    getItem: (key) => storageValues.get(key) ?? null,
    setItem: (key, value) => storageValues.set(key, value),
    removeItem: (key) => storageValues.delete(key),
  })
  let refreshResolve!: (response: Response) => void
  const refreshResponse = new Promise<Response>((resolve) => {
    refreshResolve = resolve
  })
  const apiClient = webAuthApiClientCreate({ fetch: async () => refreshResponse })
  const sessionManager = webAuthSessionCreate({ storage, apiClient })

  const restorePromise = sessionManager.restore()
  const acceptResult = sessionManager.sessionHandoffAccept(
    {
      operation: "create",
      cipherId: null,
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 3600,
      email: "new@example.com",
      userId: "new-user",
      kdf: 0,
      kdfIterations: 100_000,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: "new-wrapped-key",
      userKeyTransfer: { algorithm: "AES-GCM", iv: "A".repeat(16), ciphertext: "A" },
    },
    new Uint8Array(64),
  )
  expect(acceptResult.success).toBe(true)
  refreshResolve(new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }))

  const restoreResult = await restorePromise
  expect(restoreResult.success).toBe(true)
  expect(sessionManager.session()).toMatchObject({
    accessToken: "new-access-token",
    refreshToken: "new-refresh-token",
  })
  expect(storage.sessionLoad()).toMatchObject({
    success: true,
    data: { accessToken: "new-access-token", refreshToken: "new-refresh-token" },
  })
})
