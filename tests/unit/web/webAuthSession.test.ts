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
