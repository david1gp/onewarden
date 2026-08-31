import { expect, test } from "bun:test"
import * as v from "valibot"
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
import {
  type BitwardenPasswordTokenResponse,
  bitwardenPasswordTokenResponseSchema,
} from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import { bitwardenPreloginResponseSchema } from "../../../src/shared/api/bitwardenPreloginResponseSchema.js"
import fixtures from "../../fixtures/extensionCryptoFixtures.json"

const passwordLogin = fixtures.passwordLogin
const argon2Login = fixtures.argon2Login
const userKey = Uint8Array.from({ length: 64 }, (_, index) => index)

type LoginFixture = {
  email: string
  kdf: {
    kdfType: number
    iterations: number
    memory: number | null
    parallelism: number | null
  }
  userKeyEnc: string
}

async function digestHex(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value as Uint8Array<ArrayBuffer>)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function tokenCreate(login: LoginFixture = passwordLogin): BitwardenPasswordTokenResponse {
  return {
    access_token: "access-token",
    expires_in: 3600,
    token_type: "Bearer",
    refresh_token: "refresh-token",
    PrivateKey: null,
    Kdf: login.kdf.kdfType,
    KdfIterations: login.kdf.iterations,
    KdfMemory: login.kdf.memory,
    KdfParallelism: login.kdf.parallelism,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
    scope: "api offline_access",
    AccountKeys: null,
    UserDecryptionOptions: {
      HasMasterPassword: true,
      MasterPasswordUnlock: {
        Kdf: {
          KdfType: login.kdf.kdfType,
          Iterations: login.kdf.iterations,
          Memory: login.kdf.memory,
          Parallelism: login.kdf.parallelism,
        },
        MasterKeyEncryptedUserKey: login.userKeyEnc,
        MasterKeyWrappedUserKey: "",
        Salt: login.email,
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
      uris: [{ uri: "https://example.test/login", match: 0, uriMetadata: "preserved" }],
      uri: "https://example.test/login",
      totp: null,
      loginMetadata: "preserved",
    },
    fields: [
      { name: "Synthetic field", value: "Synthetic value", type: 0, linkedId: null, custom: true, fieldMetadata: 7 },
    ],
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
  expect(masterKeyResult.success).toBe(true)
  if (!masterKeyResult.success) return
  expect(await digestHex(masterKeyResult.data)).toBe(passwordLogin.masterKeySha256)

  const passwordHashResult = await extensionMasterPasswordHashDerive(passwordLogin.password, masterKeyResult.data)
  expect(passwordHashResult.success).toBe(true)
  if (!passwordHashResult.success) return
  expect(await digestHex(passwordHashResult.data)).toBe(passwordLogin.masterPasswordHashSha256)
})

test("extension crypto derives an Argon2id known answer with bounded parameters", async () => {
  const masterKeyResult = await extensionMasterKeyDerive(argon2Login.password, argon2Login.email, argon2Login.kdf)
  expect(masterKeyResult.success).toBe(true)
  if (!masterKeyResult.success) return
  expect(await digestHex(masterKeyResult.data)).toBe(argon2Login.masterKeySha256)
})

test("extension user-key unlock decrypts an Argon2id login fixture", async () => {
  const userKeyResult = await extensionUserKeyUnlock({
    email: argon2Login.email,
    password: argon2Login.password,
    token: tokenCreate(argon2Login),
  })
  expect(userKeyResult.success).toBe(true)
  if (!userKeyResult.success) return
  expect(await digestHex(userKeyResult.data)).toBe(passwordLogin.userKeySha256)
})

test("extension EncString decrypts the Bitwarden wire fixture and encrypts a round trip", async () => {
  const decryptedResult = await extensionEncStringDecrypt(passwordLogin.fieldEnc, userKey)
  expect(decryptedResult.success).toBe(true)
  if (!decryptedResult.success) return
  expect(new TextDecoder().decode(decryptedResult.data)).toBe("fixture secret")

  const encryptedResult = await extensionEncStringEncrypt("fixture secret", userKey)
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  expect(encryptedResult.data.startsWith("2.")).toBe(true)
  const roundTripResult = await extensionEncStringDecrypt(encryptedResult.data, userKey)
  expect(roundTripResult.success).toBe(true)
  if (!roundTripResult.success) return
  expect(new TextDecoder().decode(roundTripResult.data)).toBe("fixture secret")
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
  expect(encryptedResult.data.login.uris[0]?.uriMetadata).toBe(plainCipher.login.uris[0]?.uriMetadata)
  expect(encryptedResult.data.login.loginMetadata).toBe(plainCipher.login.loginMetadata)
  expect(encryptedResult.data.fields[0]?.type).toBe(plainCipher.fields[0]?.type)
  expect(encryptedResult.data.fields[0]?.fieldMetadata).toBe(plainCipher.fields[0]?.fieldMetadata)
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
  expect(userKeyResult.success).toBe(true)
  if (!userKeyResult.success) return
  expect(await digestHex(userKeyResult.data)).toBe(passwordLogin.userKeySha256)
})

test("extension user-key unlock accepts either compatible user-key alias", async () => {
  const encryptedOnlyToken = tokenCreate()
  delete encryptedOnlyToken.UserDecryptionOptions.MasterPasswordUnlock?.MasterKeyWrappedUserKey
  const encryptedOnlyResult = await extensionUserKeyUnlock({
    email: passwordLogin.email,
    password: passwordLogin.password,
    token: encryptedOnlyToken,
  })
  expect(encryptedOnlyResult.success).toBe(true)
  if (!encryptedOnlyResult.success) return
  expect(await digestHex(encryptedOnlyResult.data)).toBe(passwordLogin.userKeySha256)

  const wrappedOnlyToken = tokenCreate()
  const wrappedOnlyUnlock = wrappedOnlyToken.UserDecryptionOptions.MasterPasswordUnlock
  if (wrappedOnlyUnlock === null || wrappedOnlyUnlock === undefined) return
  delete wrappedOnlyUnlock.MasterKeyEncryptedUserKey
  wrappedOnlyUnlock.MasterKeyWrappedUserKey = passwordLogin.userKeyEnc
  const wrappedOnlyResult = await extensionUserKeyUnlock({
    email: passwordLogin.email,
    password: passwordLogin.password,
    token: wrappedOnlyToken,
  })
  expect(wrappedOnlyResult.success).toBe(true)
  if (!wrappedOnlyResult.success) return
  expect(await digestHex(wrappedOnlyResult.data)).toBe(passwordLogin.userKeySha256)

  const legacyKeyOnlyToken = tokenCreate()
  const legacyKeyOnlyUnlock = legacyKeyOnlyToken.UserDecryptionOptions.MasterPasswordUnlock
  if (legacyKeyOnlyUnlock === null || legacyKeyOnlyUnlock === undefined) return
  delete legacyKeyOnlyUnlock.MasterKeyEncryptedUserKey
  delete legacyKeyOnlyUnlock.MasterKeyWrappedUserKey
  legacyKeyOnlyToken.Key = passwordLogin.userKeyEnc
  const legacyKeyOnlyResult = await extensionUserKeyUnlock({
    email: passwordLogin.email,
    password: passwordLogin.password,
    token: legacyKeyOnlyToken,
  })
  expect(legacyKeyOnlyResult.success).toBe(true)
  if (!legacyKeyOnlyResult.success) return
  expect(await digestHex(legacyKeyOnlyResult.data)).toBe(passwordLogin.userKeySha256)
})

test("extension wire schemas preserve compatible unknown unlock fields", () => {
  const token = tokenCreate() as unknown as Record<string, unknown>
  const userDecryptionOptions = token.UserDecryptionOptions as Record<string, unknown>
  const unlock = userDecryptionOptions.MasterPasswordUnlock as Record<string, unknown>
  const kdf = unlock.Kdf as Record<string, unknown>
  kdf.kdfMetadata = "preserved"
  unlock.unlockMetadata = { preserved: true }
  userDecryptionOptions.optionsMetadata = "preserved"
  token.tokenMetadata = "preserved"

  const parsedToken = v.safeParse(bitwardenPasswordTokenResponseSchema, token)
  expect(parsedToken.success).toBe(true)
  if (!parsedToken.success) return
  expect(parsedToken.output.tokenMetadata).toBe("preserved")
  expect(parsedToken.output.UserDecryptionOptions.optionsMetadata).toBe("preserved")
  expect(parsedToken.output.UserDecryptionOptions.MasterPasswordUnlock?.Kdf.kdfMetadata).toBe("preserved")
  expect(parsedToken.output.UserDecryptionOptions.MasterPasswordUnlock?.unlockMetadata).toEqual({ preserved: true })

  const parsedPrelogin = v.safeParse(bitwardenPreloginResponseSchema, {
    kdf: 0,
    kdfIterations: 1,
    kdfMemory: null,
    kdfParallelism: null,
    kdfSettings: { iterations: 1, kdfType: 0, memory: null, parallelism: null, settingsMetadata: "preserved" },
    salt: null,
    preloginMetadata: "preserved",
  })
  expect(parsedPrelogin.success).toBe(true)
  if (!parsedPrelogin.success) return
  expect(parsedPrelogin.output.kdfSettings.settingsMetadata).toBe("preserved")
  expect(parsedPrelogin.output.preloginMetadata).toBe("preserved")
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
    kdfType: 2,
    iterations: 1,
    memory: 32,
    parallelism: 4,
  })
  expect(kdfResult).toMatchObject({ success: false, code: "extension.unsupported", statusCode: 400 })

  const boundedArgonResult = await extensionMasterKeyDerive("password", "user@example.com", {
    kdfType: 1,
    iterations: 11,
    memory: 32,
    parallelism: 4,
  })
  expect(boundedArgonResult).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })

  const encStringResult = await extensionEncStringDecrypt("1.AA==|AA==|AA==", userKey)
  expect(encStringResult).toMatchObject({ success: false, code: "extension.unsupported", statusCode: 400 })

  const totpResult = await extensionPersonalLoginCipherEncrypt(
    { ...plainCipherCreate(), login: { ...plainCipherCreate().login, totp: "unsupported" } },
    userKey,
  )
  expect(totpResult).toMatchObject({ success: false, code: "extension.unsupported", statusCode: 400 })
})
