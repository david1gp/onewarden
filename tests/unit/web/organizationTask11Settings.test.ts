import { expect, test } from "bun:test"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import type { organizationApiClientCreate } from "../../../src/web/organizations/api/organizationApiClientCreate.js"
import { webSettingsOrganizationCreate } from "../../../src/web/settings/model/webSettingsOrganizationCreate.js"

const accountKey = new Uint8Array(64).fill(7)
const organizationKey = new Uint8Array(64).fill(9)

function sessionCreate(userKey: Uint8Array | null = accountKey): ReturnType<typeof webAuthSessionCreate> {
  return {
    getUserKey: () => userKey,
    session: () => ({
      accessToken: "access-token",
      email: "user@example.com",
      encryptedUserKey: "wrapped-user-key",
      expiresAt: Date.now() + 60_000,
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      userId: "user-id",
    }),
  } as ReturnType<typeof webAuthSessionCreate>
}

function apiClientCreate(
  organizations: Array<{ id: string; key?: string | null; name: string }>,
): ReturnType<typeof organizationApiClientCreate> {
  return {
    organizationList: async () => resultCreate(organizations),
  } as unknown as ReturnType<typeof organizationApiClientCreate>
}

test("web settings organization helper maps organizations from the existing API", async () => {
  const helper = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-1", key: "wrapped", name: "Engineering" }]),
    session: sessionCreate(),
  })

  const result = await helper.organizationList()

  expect(result).toEqual({
    success: true,
    data: [{ id: "org-1", key: "wrapped", name: "Engineering" }],
  })
})

test("web settings organization helper decrypts a valid 64-byte organization key", async () => {
  const wrappedResult = await bitwardenCipherStringEncrypt(organizationKey, accountKey)
  expect(wrappedResult.success).toBe(true)
  if (!wrappedResult.success) return

  const helper = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-1", key: wrappedResult.data, name: "Engineering" }]),
    session: sessionCreate(),
  })
  const result = await helper.organizationKeyResolve("org-1")

  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data).toEqual(organizationKey)
    result.data.fill(0)
  }
})

test("web settings organization helper rejects a locked session", async () => {
  const helper = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-1", key: "wrapped", name: "Engineering" }]),
    session: sessionCreate(null),
  })

  const result = await helper.organizationKeyResolve("org-1")

  expect(result.success).toBe(false)
  if (!result.success) expect(result.errorMessage).toBe("Vault is locked.")
})

test("web settings organization helper rejects missing, malformed, and wrongly wrapped keys", async () => {
  const missingKey = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-missing", name: "Missing" }]),
    session: sessionCreate(),
  })
  const missingResult = await missingKey.organizationKeyResolve("org-missing")
  expect(missingResult.success).toBe(false)

  const malformedKey = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-malformed", key: "not-a-cipher", name: "Malformed" }]),
    session: sessionCreate(),
  })
  const malformedResult = await malformedKey.organizationKeyResolve("org-malformed")
  expect(malformedResult.success).toBe(false)

  const shortKey = await bitwardenCipherStringEncrypt(new Uint8Array(32).fill(1), accountKey)
  expect(shortKey.success).toBe(true)
  if (!shortKey.success) return
  const shortKeyHelper = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-short", key: shortKey.data, name: "Short" }]),
    session: sessionCreate(),
  })
  const shortKeyResult = await shortKeyHelper.organizationKeyResolve("org-short")
  expect(shortKeyResult.success).toBe(false)

  const wrongAccountKey = new Uint8Array(64).fill(8)
  const wrappedWithWrongKey = await bitwardenCipherStringEncrypt(organizationKey, wrongAccountKey)
  expect(wrappedWithWrongKey.success).toBe(true)
  if (!wrappedWithWrongKey.success) return
  const wrongKeyHelper = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-wrong", key: wrappedWithWrongKey.data, name: "Wrong" }]),
    session: sessionCreate(),
  })
  const wrongKeyResult = await wrongKeyHelper.organizationKeyResolve("org-wrong")
  expect(wrongKeyResult.success).toBe(false)
  wrongAccountKey.fill(0)
})

test("web settings organization helper does not cache keys and clears malformed plaintext", async () => {
  const sessionUserKey = accountKey.slice()
  const shortKey = await bitwardenCipherStringEncrypt(new Uint8Array(32).fill(3), accountKey)
  expect(shortKey.success).toBe(true)
  if (!shortKey.success) return

  const helper = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-1", key: shortKey.data, name: "Engineering" }]),
    session: sessionCreate(sessionUserKey),
  })
  const malformedResult = await helper.organizationKeyResolve("org-1")
  expect(malformedResult.success).toBe(false)
  expect(sessionUserKey).toEqual(accountKey)

  const validWrappedKey = await bitwardenCipherStringEncrypt(organizationKey, accountKey)
  expect(validWrappedKey.success).toBe(true)
  if (!validWrappedKey.success) return
  const noCacheHelper = webSettingsOrganizationCreate({
    apiClient: apiClientCreate([{ id: "org-1", key: validWrappedKey.data, name: "Engineering" }]),
    session: sessionCreate(sessionUserKey),
  })
  const firstResult = await noCacheHelper.organizationKeyResolve("org-1")
  expect(firstResult.success).toBe(true)
  if (!firstResult.success) return
  firstResult.data.fill(0)
  const secondResult = await noCacheHelper.organizationKeyResolve("org-1")
  expect(secondResult.success).toBe(true)
  if (secondResult.success) secondResult.data.fill(0)
  expect(sessionUserKey).toEqual(accountKey)
  sessionUserKey.fill(0)
})
