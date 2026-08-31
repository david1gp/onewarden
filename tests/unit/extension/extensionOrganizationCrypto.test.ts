import { expect, test } from "bun:test"
import { extensionCipherKeyResolve } from "../../../src/extension/crypto/extensionCipherKeyResolve.js"
import { extensionEncStringEncrypt } from "../../../src/extension/crypto/extensionEncStringEncrypt.js"
import { extensionOrganizationKeyDecrypt } from "../../../src/extension/crypto/extensionOrganizationKeyDecrypt.js"
import { extensionPersonalLoginCipherDecrypt } from "../../../src/extension/crypto/extensionPersonalLoginCipherDecrypt.js"
import { extensionUserPrivateKeyDecrypt } from "../../../src/extension/crypto/extensionUserPrivateKeyDecrypt.js"
import type { BitwardenEncryptedLoginCipher } from "../../../src/shared/api/bitwardenEncryptedLoginCipherSchema.js"
import organizationFixture from "../../fixtures/extensionOrganizationFixtures.json"

const userKey = Uint8Array.from({ length: 64 }, (_, index) => index)
const cipher = organizationFixture.cipher as unknown as BitwardenEncryptedLoginCipher

async function digestHex(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value as Uint8Array<ArrayBuffer>)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

test("extension resolves personal, organization, and cipher-specific keys", async () => {
  const organizationKey = Uint8Array.from({ length: 64 }, (_, index) => 255 - index)
  const cipherKey = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const encryptedCipherKeyResult = await extensionEncStringEncrypt(cipherKey, userKey)
  expect(encryptedCipherKeyResult.success).toBe(true)
  if (!encryptedCipherKeyResult.success) return

  const personalResult = await extensionCipherKeyResolve({ ...cipher, organizationId: null, key: null }, userKey)
  expect(personalResult).toEqual({ success: true, data: userKey })

  const organizationResult = await extensionCipherKeyResolve(
    { ...cipher, key: null },
    userKey,
    new Map([[organizationFixture.organizationId, organizationKey]]),
  )
  expect(organizationResult).toEqual({ success: true, data: organizationKey })

  const cipherSpecificResult = await extensionCipherKeyResolve(
    { ...cipher, organizationId: null, key: encryptedCipherKeyResult.data },
    userKey,
  )
  expect(cipherSpecificResult).toEqual({ success: true, data: cipherKey })

  const missingOrganizationResult = await extensionCipherKeyResolve({ ...cipher, key: null }, userKey)
  expect(missingOrganizationResult).toMatchObject({ success: false, code: "platform.unauthorized" })
})

test("extension decrypts a real organization key and cipher-specific login fixture", async () => {
  const privateKeyResult = await extensionUserPrivateKeyDecrypt(organizationFixture.userPrivateKeyEnc, userKey)
  expect(privateKeyResult.success).toBe(true)
  if (!privateKeyResult.success) return

  const organizationKeyResult = await extensionOrganizationKeyDecrypt(
    organizationFixture.organizationKeyEnc,
    privateKeyResult.data,
  )
  expect(organizationKeyResult.success).toBe(true)
  if (!organizationKeyResult.success) return
  expect(await digestHex(organizationKeyResult.data)).toBe(organizationFixture.organizationKeySha256)

  const cipherKeyResult = await extensionCipherKeyResolve(
    cipher,
    userKey,
    new Map([[organizationFixture.organizationId, organizationKeyResult.data]]),
  )
  expect(cipherKeyResult.success).toBe(true)
  if (!cipherKeyResult.success) return
  expect(await digestHex(cipherKeyResult.data)).toBe(organizationFixture.cipherKeySha256)

  const decryptedResult = await extensionPersonalLoginCipherDecrypt(
    cipher,
    userKey,
    new Map([[organizationFixture.organizationId, organizationKeyResult.data]]),
  )
  expect(decryptedResult).toMatchObject({
    success: true,
    data: {
      id: "organization-cipher",
      organizationId: organizationFixture.organizationId,
      name: "Organization fixture login",
      notes: "Organization fixture notes",
      edit: true,
      viewPassword: true,
      login: {
        username: "organization-user",
        password: "organization-password",
        uris: [{ uri: "https://organization.example/login", match: 0 }],
      },
      fields: [{ name: "Organization custom", value: "Organization value", type: 0, linkedId: null }],
    },
  })
})

test("extension never decrypts a hidden organization password and preserves edit permission", async () => {
  const privateKeyResult = await extensionUserPrivateKeyDecrypt(organizationFixture.userPrivateKeyEnc, userKey)
  expect(privateKeyResult.success).toBe(true)
  if (!privateKeyResult.success) return
  const organizationKeyResult = await extensionOrganizationKeyDecrypt(
    organizationFixture.organizationKeyEnc,
    privateKeyResult.data,
  )
  expect(organizationKeyResult.success).toBe(true)
  if (!organizationKeyResult.success) return

  const hiddenCipher = {
    ...cipher,
    edit: false,
    viewPassword: false,
    login: { ...cipher.login, password: "not-a-valid-cipher-string" },
  }
  const result = await extensionPersonalLoginCipherDecrypt(
    hiddenCipher,
    userKey,
    new Map([[organizationFixture.organizationId, organizationKeyResult.data]]),
  )
  expect(result).toMatchObject({
    success: true,
    data: { edit: false, viewPassword: false, login: { password: null } },
  })
})
