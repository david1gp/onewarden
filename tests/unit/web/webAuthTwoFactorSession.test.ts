import { expect, test } from "bun:test"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { webAuthUserKeysGenerate } from "../../../src/web/auth/model/webAuthUserKeysGenerate.js"

test("webAuthSession handles two-factor login challenge and verification flow", async () => {
  const email = "twofactor-user@example.com"
  const password = "Password123!"
  const kdf = { kdfType: 0, iterations: 600_000, memory: null, parallelism: null }

  const keysResult = await webAuthUserKeysGenerate(password, email, kdf)
  if (!keysResult.success) throw new Error(keysResult.errorMessage)

  let twoFactorStep = 0
  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const body = String(init?.body ?? "")

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
      if (body.includes("two_factor_provider=0") && body.includes("two_factor_token=123456")) {
        twoFactorStep = 2
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
            TwoFactorToken: "remember-token-12345",
            UserDecryptionOptions: {
              HasMasterPassword: true,
              MasterPasswordUnlock: {
                Kdf: { KdfType: 0, Iterations: 600_000, Memory: null, Parallelism: null },
                MasterKeyEncryptedUserKey: keysResult.data.wrappedUserKey,
                MasterKeyWrappedUserKey: keysResult.data.wrappedUserKey,
                Salt: email,
              },
              Object: "userDecryptionOptions",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      twoFactorStep = 1
      return new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Two factor required.",
          TwoFactorProviders: ["0", "1"],
          TwoFactorProviders2: {
            "0": null,
            "1": { Email: "tw***@example.com" },
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      )
    }

    return new Response("Not found", { status: 404 })
  }

  const memoryStore = new Map<string, string>()
  const storage = webAuthStorageCreate({
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, val) => memoryStore.set(key, val),
    removeItem: (key) => memoryStore.delete(key),
  })

  const apiClient = webAuthApiClientCreate({ fetch: fakeFetch })
  const session = webAuthSessionCreate({ storage, apiClient })

  const initialLoginResult = await session.login({ email, masterPassword: password })
  expect(initialLoginResult.success).toBe(false)
  expect(twoFactorStep).toBe(1)
  expect(session.pendingTwoFactor()).not.toBeNull()
  expect(session.pendingTwoFactor()?.challenge.TwoFactorProviders).toEqual(["0", "1"])
  expect(session.isUnlocked()).toBe(false)

  const twoFactorLoginResult = await session.loginTwoFactor({
    provider: 0,
    token: "123456",
    remember: true,
  })
  expect(twoFactorLoginResult.success).toBe(true)
  expect(twoFactorStep).toBe(2)
  expect(session.isUnlocked()).toBe(true)
  expect(session.pendingTwoFactor()).toBeNull()

  const rememberedToken = storage.rememberTokenLoad(email)
  expect(rememberedToken.success).toBe(true)
  if (!rememberedToken.success) throw new Error(rememberedToken.errorMessage)
  expect(rememberedToken.data).toBe("remember-token-12345")
})
