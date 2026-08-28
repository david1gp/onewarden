import { expect, test } from "bun:test"
import { extensionEncStringDecrypt } from "../../../src/extension/crypto/extensionEncStringDecrypt.js"
import { extensionEncStringEncrypt } from "../../../src/extension/crypto/extensionEncStringEncrypt.js"
import { extensionMasterKeyDerive } from "../../../src/extension/crypto/extensionMasterKeyDerive.js"
import { extensionMasterPasswordHashDerive } from "../../../src/extension/crypto/extensionMasterPasswordHashDerive.js"
import { extensionPersonalLoginCipherDecrypt } from "../../../src/extension/crypto/extensionPersonalLoginCipherDecrypt.js"
import { extensionPersonalLoginCipherEncrypt } from "../../../src/extension/crypto/extensionPersonalLoginCipherEncrypt.js"
import { extensionUserKeyUnlock } from "../../../src/extension/crypto/extensionUserKeyUnlock.js"
import { extensionVaultSessionCreate } from "../../../src/extension/session/extensionVaultSessionCreate.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import fixtures from "../../fixtures/extensionCryptoFixtures.json"

const passwordLogin = fixtures.passwordLogin
const userKey = new Uint8Array(passwordLogin.userKey)

function tokenCreate(): BitwardenPasswordTokenResponse {
  return {
    access_token: "access-token",
    expires_in: 3600,
    token_type: "Bearer",
    refresh_token: "refresh-token",
    PrivateKey: null,
    Kdf: passwordLogin.kdf.kdfType,
    KdfIterations: passwordLogin.kdf.iterations,
    KdfMemory: passwordLogin.kdf.memory,
    KdfParallelism: passwordLogin.kdf.parallelism,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
    scope: "api offline_access",
    AccountKeys: null,
    UserDecryptionOptions: {
      HasMasterPassword: true,
      MasterPasswordUnlock: {
        Kdf: {
          KdfType: passwordLogin.kdf.kdfType,
          Iterations: passwordLogin.kdf.iterations,
          Memory: passwordLogin.kdf.memory,
          Parallelism: passwordLogin.kdf.parallelism,
        },
        MasterKeyEncryptedUserKey: passwordLogin.userKeyEnc,
        MasterKeyWrappedUserKey: "",
        Salt: passwordLogin.email,
      },
      Object: "userDecryptionOptions",
    },
  }
}

function plainCipherCreate() {
  return {
    object: "cipherDetails" as const,
    id: "cipher-id",
    type: 1 as const,
    creationDate: "2026-08-28T00:00:00.000Z",
    revisionDate: "2026-08-28T00:00:00.000Z",
    deletedDate: null,
    organizationId: null,
    folderId: "folder-id",
    name: "Synthetic login",
    notes: "Synthetic notes",
    favorite: true,
    login: {
      username: "synthetic-user",
      password: "synthetic-password",
      uris: [{ uri: "https://example.test/login", match: 0 }],
      uri: "https://example.test/login",
      totp: null,
    },
    fields: [{ name: "Synthetic field", value: "Synthetic value", type: 0, linkedId: null, custom: true }],
    metadataOnly: "left unchanged",
  }
}

function storageCreate() {
  const valuesCreate = () => {
    const values = new Map<string, unknown>()
    const area: ExtensionStorageArea = {
      async get<T extends Record<string, unknown> = Record<string, unknown>>(
        keys?: string | string[] | null,
      ): Promise<T> {
        const requestedKeys =
          keys === undefined || keys === null ? [...values.keys()] : typeof keys === "string" ? [keys] : keys
        const result: Record<string, unknown> = {}
        for (const key of requestedKeys) {
          const value = values.get(key)
          if (value !== undefined) result[key] = value
        }
        return result as T
      },
      async set(items) {
        for (const [key, value] of Object.entries(items)) values.set(key, value)
      },
      async remove(keys) {
        for (const key of typeof keys === "string" ? [keys] : keys) values.delete(key)
      },
    }
    return { area, values }
  }
  const local = valuesCreate()
  const session = valuesCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: local.area, session: session.area })
  return { local, session, storage: extensionStorageCreate(adapter) }
}

test("extension crypto derives Bitwarden password-login fixture values", async () => {
  const masterKeyResult = await extensionMasterKeyDerive(passwordLogin.password, passwordLogin.email, passwordLogin.kdf)
  expect(masterKeyResult).toEqual({ success: true, data: new Uint8Array(passwordLogin.masterKey) })
  if (!masterKeyResult.success) return

  const passwordHashResult = await extensionMasterPasswordHashDerive(passwordLogin.password, masterKeyResult.data)
  expect(passwordHashResult).toEqual({ success: true, data: new Uint8Array(passwordLogin.masterPasswordHash) })
})

test("extension EncString decrypts the Bitwarden wire fixture and encrypts a round trip", async () => {
  const decryptedResult = await extensionEncStringDecrypt(passwordLogin.fieldEnc, userKey)
  expect(decryptedResult).toEqual({ success: true, data: new TextEncoder().encode("fixture secret") })

  const encryptedResult = await extensionEncStringEncrypt("fixture secret", userKey)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  expect(encryptedResult.data.startsWith("2.")).toBe(true)
  expect(await extensionEncStringDecrypt(encryptedResult.data, userKey)).toEqual(decryptedResult)
})

test("extension personal login mapping encrypts only supported nested fields", async () => {
  const plainCipher = plainCipherCreate()
  const encryptedResult = await extensionPersonalLoginCipherEncrypt(plainCipher, userKey)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return

  expect(encryptedResult.data.name).not.toBe(plainCipher.name)
  expect(encryptedResult.data.notes).not.toBe(plainCipher.notes)
  expect(encryptedResult.data.login.username).not.toBe(plainCipher.login.username)
  expect(encryptedResult.data.login.password).not.toBe(plainCipher.login.password)
  expect(encryptedResult.data.login.uris[0]?.uri).not.toBe(plainCipher.login.uris[0]?.uri)
  expect(encryptedResult.data.login.uri).not.toBe(plainCipher.login.uri)
  expect(encryptedResult.data.fields[0]?.name).not.toBe(plainCipher.fields[0]?.name)
  expect(encryptedResult.data.fields[0]?.value).not.toBe(plainCipher.fields[0]?.value)
  expect(encryptedResult.data.login.uris[0]?.match).toBe(plainCipher.login.uris[0]?.match)
  expect(encryptedResult.data.fields[0]?.type).toBe(plainCipher.fields[0]?.type)
  expect(encryptedResult.data.metadataOnly).toBe(plainCipher.metadataOnly)

  const decryptedResult = await extensionPersonalLoginCipherDecrypt(encryptedResult.data, userKey)
  expect(decryptedResult).toEqual({ success: true, data: plainCipher })
})

test("extension user-key unlock accepts the encrypted key without requiring the newer wrapped-key mode", async () => {
  const userKeyResult = await extensionUserKeyUnlock({
    email: passwordLogin.email,
    password: passwordLogin.password,
    token: tokenCreate(),
  })
  expect(userKeyResult).toEqual({ success: true, data: userKey })
})

test("extension vault session clears its in-memory user key on lock and logout", async () => {
  const { local, session, storage } = storageCreate()
  const vaultSession = extensionVaultSessionCreate(storage, () => 1_756_368_000_000)
  const unlockResult = await vaultSession.unlock({
    email: passwordLogin.email,
    password: passwordLogin.password,
    token: tokenCreate(),
  })
  expect(unlockResult.success).toBe(true)
  expect(vaultSession.isUnlocked()).toBe(true)
  expect(local.values.size).toBe(0)
  expect(session.values.size).toBe(1)

  expect((await vaultSession.lock()).success).toBe(true)
  expect(vaultSession.isUnlocked()).toBe(false)
  expect((await vaultSession.personalLoginCipherDecrypt({} as never)).success).toBe(false)

  expect(
    (await vaultSession.unlock({ email: passwordLogin.email, password: passwordLogin.password, token: tokenCreate() }))
      .success,
  ).toBe(true)
  expect((await vaultSession.logout()).success).toBe(true)
  expect(vaultSession.isUnlocked()).toBe(false)
})

test("extension crypto returns explicit unsupported Results for unsupported modes", async () => {
  const kdfResult = await extensionMasterKeyDerive("password", "user@example.com", {
    kdfType: 1,
    iterations: 1,
    memory: 32,
    parallelism: 4,
  })
  expect(kdfResult).toMatchObject({ success: false, code: "extension.unsupported", statusCode: 400 })

  const encStringResult = await extensionEncStringDecrypt("1.AA==|AA==|AA==", userKey)
  expect(encStringResult).toMatchObject({ success: false, code: "extension.unsupported", statusCode: 400 })

  const totpResult = await extensionPersonalLoginCipherEncrypt(
    { ...plainCipherCreate(), login: { ...plainCipherCreate().login, totp: "unsupported" } },
    userKey,
  )
  expect(totpResult).toMatchObject({ success: false, code: "extension.unsupported", statusCode: 400 })
})
