import { expect, test } from "bun:test"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { webAuthUserKeysGenerate } from "../../../src/web/auth/model/webAuthUserKeysGenerate.js"
import { accountKdfChangeExecute } from "../../../src/web/settings/model/accountKdfChangeExecute.js"
import { accountKeysRotateExecute } from "../../../src/web/settings/model/accountKeysRotateExecute.js"
import { accountPasswordChangeExecute } from "../../../src/web/settings/model/accountPasswordChangeExecute.js"
import { bitwardenCsvFormat } from "../../../src/web/settings/model/bitwardenCsvFormat.js"
import { bitwardenCsvParse } from "../../../src/web/settings/model/bitwardenCsvParse.js"
import { vaultExportExecute } from "../../../src/web/settings/model/vaultExportExecute.js"
import { vaultImportExecute } from "../../../src/web/settings/model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../../../src/web/settings/model/webSettingsApiClientCreate.js"

test("CSV formatter and parser correctly handle fields and quotes", () => {
  const records = [
    {
      folder: "Work, Items",
      favorite: true,
      type: "login",
      name: 'Google "Account"',
      notes: "Line 1\nLine 2",
      fields: null,
      reprompt: 0,
      login_uri: "https://accounts.google.com",
      login_username: "user@gmail.com",
      login_password: "Password123!",
      login_totp: "JBSWY3DPEHPK3PXP",
    },
  ]

  const csv = bitwardenCsvFormat(records)
  expect(csv.includes('"Work, Items"')).toBe(true)
  expect(csv.includes('"Google ""Account"""')).toBe(true)

  const parsed = bitwardenCsvParse(csv)
  expect(parsed.success).toBe(true)
  if (parsed.success) {
    expect(parsed.data.length).toBe(1)
    expect(parsed.data[0]?.name).toBe('Google "Account"')
    expect(parsed.data[0]?.folder).toBe("Work, Items")
    expect(parsed.data[0]?.login_username).toBe("user@gmail.com")
    expect(parsed.data[0]?.favorite).toBe(true)
  }
})

test("accountPasswordChangeExecute, accountKdfChangeExecute, and vaultExport/Import execute correctly", async () => {
  const memoryStore = new Map<string, string>()
  const storage = webAuthStorageCreate({
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, val) => memoryStore.set(key, val),
    removeItem: (key) => memoryStore.delete(key),
  })

  // Generate initial keys for user
  const initialKeysResult = await webAuthUserKeysGenerate("InitialPassword123!", "user@example.com", {
    kdfType: 0,
    iterations: 1000,
    memory: null,
    parallelism: null,
  })
  expect(initialKeysResult.success).toBe(true)
  if (!initialKeysResult.success) return

  storage.sessionSave({
    email: "user@example.com",
    accessToken: "access-token-xyz",
    refreshToken: "refresh-token-xyz",
    tokenType: "Bearer",
    expiresAt: Date.now() + 3600_000,
    userId: "user-uuid-123",
    kdf: 0,
    kdfIterations: 1000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: initialKeysResult.data.wrappedUserKey,
  })

  const session = webAuthSessionCreate({ storage })
  // Unlock session
  const unlockRes = await session.unlock("InitialPassword123!")
  expect(unlockRes.success).toBe(true)

  let capturedPasswordChangePayload: any = null
  let capturedKdfPayload: any = null

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const bodyText = String(init?.body ?? "")

    if (url.endsWith("/api/accounts/password")) {
      capturedPasswordChangePayload = JSON.parse(bodyText)
      return new Response(null, { status: 200 })
    }
    if (url.endsWith("/api/accounts/kdf")) {
      capturedKdfPayload = JSON.parse(bodyText)
      return new Response(null, { status: 200 })
    }
    if (url.endsWith("/api/accounts/key-management/rotate-user-account-keys")) {
      return new Response(null, { status: 200 })
    }
    if (url.endsWith("/api/sync")) {
      return new Response(
        JSON.stringify({
          profile: { id: "user-uuid-123", email: "user@example.com" },
          folders: [],
          ciphers: [],
          collections: [],
          policies: [],
          sends: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }
    if (url.endsWith("/api/ciphers/import")) {
      return new Response(JSON.stringify({ revisionDate: "2026-08-29T12:00:00.000Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    return new Response("Not found", { status: 404 })
  }

  const apiClient = webSettingsApiClientCreate({ fetch: fakeFetch })

  // Test Password Change
  const pwdChangeRes = await accountPasswordChangeExecute({
    session,
    currentPassword: "InitialPassword123!",
    newPassword: "NewSecretPassword456!",
    newHint: "My new hint",
    apiClient,
  })
  expect(pwdChangeRes.success).toBe(true)
  expect(capturedPasswordChangePayload).not.toBeNull()
  expect(capturedPasswordChangePayload.masterPasswordHint).toBe("My new hint")
  expect(capturedPasswordChangePayload.key.startsWith("2.")).toBe(true)

  // Test KDF Change
  const kdfChangeRes = await accountKdfChangeExecute({
    session,
    currentPassword: "InitialPassword123!",
    kdfType: 0,
    iterations: 2000,
    apiClient,
  })
  expect(kdfChangeRes.success).toBe(true)
  expect(capturedKdfPayload).not.toBeNull()
  expect(capturedKdfPayload.unlockData.kdf.kdfIterations).toBe(2000)

  // Test Key Rotation
  const rotateRes = await accountKeysRotateExecute({
    session,
    currentPassword: "InitialPassword123!",
    apiClient,
  })
  expect(rotateRes.success).toBe(true)

  // Test Vault Export (JSON & CSV)
  const exportJsonRes = await vaultExportExecute({
    session,
    format: "json-decrypted",
    apiClient,
  })
  expect(exportJsonRes.success).toBe(true)
  if (exportJsonRes.success) {
    expect(exportJsonRes.data.filename.endsWith(".json")).toBe(true)
    const jsonParsed = JSON.parse(exportJsonRes.data.content)
    expect(jsonParsed.encrypted).toBe(false)
  }

  const exportCsvRes = await vaultExportExecute({
    session,
    format: "csv-decrypted",
    apiClient,
  })
  expect(exportCsvRes.success).toBe(true)
  if (exportCsvRes.success) {
    expect(exportCsvRes.data.filename.endsWith(".csv")).toBe(true)
  }

  // Test Vault Import (JSON)
  const sampleImportJson = JSON.stringify({
    encrypted: false,
    folders: [{ id: "f-1", name: "Personal" }],
    items: [
      {
        folderId: "f-1",
        type: 1,
        name: "GitHub",
        notes: "Dev account",
        login: { username: "octocat", password: "Password!" },
      },
    ],
  })

  const importRes = await vaultImportExecute({
    session,
    rawContent: sampleImportJson,
    format: "json",
    apiClient,
  })
  expect(importRes.success).toBe(true)
  if (importRes.success) {
    expect(importRes.data.cipherCount).toBe(1)
    expect(importRes.data.folderCount).toBe(1)
  }
})
