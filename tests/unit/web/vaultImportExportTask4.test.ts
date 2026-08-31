import { expect, test } from "bun:test"
import { base64Decode } from "../../../src/shared/crypto/base64Decode.js"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthUserKeysGenerate } from "../../../src/web/auth/model/webAuthUserKeysGenerate.js"
import { bitwardenPortableEncryptedJsonEnvelopeDecrypt } from "../../../src/web/settings/model/bitwardenPortableEncryptedJsonEnvelopeDecrypt.js"
import { vaultExportExecute } from "../../../src/web/settings/model/vaultExportExecute.js"
import { vaultImportExecute } from "../../../src/web/settings/model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../../../src/web/settings/model/webSettingsApiClientCreate.js"
import portableFixtures from "../../fixtures/bitwardenPortableEncryptedJsonTask4.json"

const userKey = new Uint8Array(64)
const exportPassword = "fixture-password"

function testSession(
  options: { userKey?: Uint8Array | null; encryptedUserKey?: string; kdfIterations?: number } = {},
): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      email: "user@example.test",
      accessToken: "test-token",
      refreshToken: "test-refresh-token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60_000,
      userId: "user-id",
      kdf: 0,
      kdfIterations: options.kdfIterations ?? 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: options.encryptedUserKey ?? "wrapped-user-key",
    }),
    getUserKey: () => (options.userKey === undefined ? userKey : options.userKey),
  } as ReturnType<typeof webAuthSessionCreate>
}

function importApiClient(importCalls: { count: number; payload: unknown }) {
  return webSettingsApiClientCreate({
    fetch: async (input, init) => {
      if (!String(input).endsWith("/api/ciphers/import")) return new Response("Not found", { status: 404 })
      importCalls.count += 1
      importCalls.payload = JSON.parse(String(init?.body ?? ""))
      return new Response(JSON.stringify({ revisionDate: "2026-08-31T12:00:00.000Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    },
  })
}

async function encrypted(value: string | null): Promise<string | null> {
  if (value === null) return null
  const result = await bitwardenCipherStringEncrypt(value, userKey)
  expect(result.success).toBe(true)
  return result.success ? result.data : null
}

test("portable PBKDF2 and Argon2id fixtures decrypt through the validated JSON adapter", async () => {
  const pbkdf2Result = await bitwardenPortableEncryptedJsonEnvelopeDecrypt(portableFixtures.pbkdf2, exportPassword)
  expect(pbkdf2Result.success).toBe(true)
  if (pbkdf2Result.success) {
    expect(pbkdf2Result.data).toMatchObject({
      encrypted: false,
      folders: [{ id: "fixture-folder", name: "Personal" }],
      items: [{ type: 1, name: "Fixture Login", folderId: "fixture-folder" }],
    })
  }

  const argon2Result = await bitwardenPortableEncryptedJsonEnvelopeDecrypt(portableFixtures.argon2id, exportPassword)
  expect(argon2Result.success).toBe(true)
  if (argon2Result.success) expect(argon2Result.data.items).toHaveLength(1)

  for (const envelope of [portableFixtures.pbkdf2, portableFixtures.argon2id]) {
    const calls = { count: 0, payload: null as unknown }
    const importResult = await vaultImportExecute({
      session: testSession(),
      rawContent: JSON.stringify(envelope),
      format: "json",
      filePassword: exportPassword,
      apiClient: importApiClient(calls),
    })
    expect(importResult.success).toBe(true)
    expect(calls.count).toBe(1)
  }
})

test("portable import does not persist plaintext after password or integrity failures", async () => {
  const wrongPasswordCalls = { count: 0, payload: null as unknown }
  const wrongPasswordResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(portableFixtures.pbkdf2),
    format: "json",
    filePassword: "wrong-password",
    apiClient: importApiClient(wrongPasswordCalls),
  })
  expect(wrongPasswordResult.success).toBe(false)
  if (wrongPasswordResult.success) return
  expect(wrongPasswordResult.errorMessage).toContain("password or integrity")
  expect(wrongPasswordCalls.count).toBe(0)

  const tampered = structuredClone(portableFixtures.pbkdf2)
  tampered.data = `${tampered.data.slice(0, -2)}${tampered.data.endsWith("A=") ? "B=" : "A="}`
  const tamperedCalls = { count: 0, payload: null as unknown }
  const tamperedResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(tampered),
    format: "json",
    filePassword: exportPassword,
    apiClient: importApiClient(tamperedCalls),
  })
  expect(tamperedResult.success).toBe(false)
  if (tamperedResult.success) return
  expect(tamperedResult.errorMessage).toContain("password or integrity")
  expect(tamperedCalls.count).toBe(0)
})

test("portable import rejects account-encrypted, malformed, unsupported, and unsafe envelopes", async () => {
  const accountEncrypted = {
    encrypted: true,
    encKeyValidation_DO_NOT_EDIT: "2.invalid",
    folders: [],
    items: [],
  }
  const invalidInputs: Array<{ value: unknown; message: string }> = [
    { value: accountEncrypted, message: "Account-restricted" },
    { value: { ...portableFixtures.pbkdf2, data: undefined }, message: "envelope" },
    { value: { ...portableFixtures.pbkdf2, salt: "c2FsdA==" }, message: "envelope" },
    { value: { ...portableFixtures.pbkdf2, kdfType: 2 }, message: "Unsupported" },
    { value: { ...portableFixtures.pbkdf2, kdfIterations: 1 }, message: "between" },
    { value: { ...portableFixtures.argon2id, kdfMemory: 8 }, message: "between" },
  ]

  for (const input of invalidInputs) {
    const calls = { count: 0, payload: null as unknown }
    const result = await vaultImportExecute({
      session: testSession(),
      rawContent: JSON.stringify(input.value),
      format: "json",
      filePassword: exportPassword,
      apiClient: importApiClient(calls),
    })
    expect(result.success).toBe(false)
    if (result.success) continue
    expect(result.errorMessage).toContain(input.message)
    expect(calls.count).toBe(0)
  }

  const missingPasswordCalls = { count: 0, payload: null as unknown }
  const missingPasswordResult = await vaultImportExecute({
    session: testSession(),
    rawContent: JSON.stringify(portableFixtures.pbkdf2),
    format: "json",
    apiClient: importApiClient(missingPasswordCalls),
  })
  expect(missingPasswordResult.success).toBe(false)
  if (!missingPasswordResult.success) expect(missingPasswordResult.errorMessage).toContain("password is required")
  expect(missingPasswordCalls.count).toBe(0)
})

test("locked portable import uses distinct file and master passwords", async () => {
  const masterPassword = "account-master-password"
  const keysResult = await webAuthUserKeysGenerate(masterPassword, "user@example.test", {
    kdfType: 0,
    iterations: 1_000,
    memory: null,
    parallelism: null,
  })
  expect(keysResult.success).toBe(true)
  if (!keysResult.success) return

  const calls = { count: 0, payload: null as unknown }
  const result = await vaultImportExecute({
    session: testSession({
      userKey: null,
      encryptedUserKey: keysResult.data.wrappedUserKey,
      kdfIterations: 1_000,
    }),
    rawContent: JSON.stringify(portableFixtures.pbkdf2),
    format: "json",
    filePassword: exportPassword,
    masterPassword,
    apiClient: importApiClient(calls),
  })

  expect(result.success).toBe(true)
  expect(calls.count).toBe(1)
})

test("locked portable import does not use the file password as the master password", async () => {
  const keysResult = await webAuthUserKeysGenerate("account-master-password", "user@example.test", {
    kdfType: 0,
    iterations: 1_000,
    memory: null,
    parallelism: null,
  })
  expect(keysResult.success).toBe(true)
  if (!keysResult.success) return

  const calls = { count: 0, payload: null as unknown }
  const result = await vaultImportExecute({
    session: testSession({
      userKey: null,
      encryptedUserKey: keysResult.data.wrappedUserKey,
      kdfIterations: 1_000,
    }),
    rawContent: JSON.stringify(portableFixtures.pbkdf2),
    format: "json",
    filePassword: exportPassword,
    masterPassword: "wrong-master-password",
    apiClient: importApiClient(calls),
  })

  expect(result.success).toBe(false)
  if (!result.success) expect(result.errorMessage).toContain("Invalid master password")
  expect(calls.count).toBe(0)
})

test("portable export emits the current Bitwarden PBKDF2 envelope and round-trips", async () => {
  const sync = {
    folders: [{ id: "folder-id", name: await encrypted("Personal") }],
    ciphers: [
      {
        id: "cipher-id",
        organizationId: null,
        folderId: "folder-id",
        type: 1,
        reprompt: 0,
        name: await encrypted("Exported Login"),
        notes: await encrypted("Notes"),
        favorite: true,
        login: {
          uris: [{ uri: await encrypted("https://example.test"), match: 0 }],
          username: await encrypted("fixture-user"),
          password: await encrypted("fixture-secret"),
          totp: null,
          passwordRevisionDate: null,
        },
        fields: [],
        passwordHistory: [],
        creationDate: "2026-08-01T12:00:00.000Z",
        revisionDate: "2026-08-31T12:00:00.000Z",
        deletedDate: null,
        archivedDate: null,
      },
    ],
  }
  const result = await vaultExportExecute({
    session: testSession(),
    format: "json-encrypted",
    password: exportPassword,
    apiClient: webSettingsApiClientCreate({
      fetch: async (input) =>
        String(input).endsWith("/api/sync")
          ? new Response(JSON.stringify(sync), { status: 200, headers: { "content-type": "application/json" } })
          : new Response("Not found", { status: 404 }),
    }),
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  const envelope = JSON.parse(result.data.content) as Record<string, unknown>
  expect(envelope).toMatchObject({ encrypted: true, passwordProtected: true, kdfType: 0, kdfIterations: 600_000 })
  const saltResult = base64Decode(String(envelope.salt))
  expect(saltResult.success).toBe(true)
  if (saltResult.success) expect(saltResult.data).toHaveLength(16)
  expect(envelope.kdfMemory).toBeUndefined()
  expect(envelope.kdfParallelism).toBeUndefined()
  expect(envelope.encKeyValidation_DO_NOT_EDIT).toEqual(expect.stringMatching(/^2\./))
  expect(envelope.data).toEqual(expect.stringMatching(/^2\./))
  expect(envelope.data).not.toContain("Exported Login")

  const decryptedResult = await bitwardenPortableEncryptedJsonEnvelopeDecrypt(envelope, exportPassword)
  expect(decryptedResult.success).toBe(true)
  if (decryptedResult.success) {
    expect(decryptedResult.data.items[0]).toMatchObject({ name: "Exported Login", favorite: true })
  }
})
