import { expect, test } from "bun:test"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import { bitwardenAttachmentZipEntriesCollect } from "../../../src/web/settings/model/bitwardenAttachmentZipEntriesCollect.js"
import { webSettingsApiClientCreate } from "../../../src/web/settings/model/webSettingsApiClientCreate.js"

const userKey = Uint8Array.from({ length: 64 }, (_, index) => index)
const attachmentKey = Uint8Array.from({ length: 64 }, (_, index) => index)
const encryptedBytes = Uint8Array.from([
  2, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 127, 138, 55, 48, 121, 63, 75, 180,
  17, 231, 166, 21, 173, 98, 50, 126, 162, 217, 24, 141, 182, 136, 204, 58, 167, 221, 169, 66, 98, 144, 121, 125, 34,
  76, 39, 244, 186, 55, 139, 39, 211, 214, 136, 138, 220, 237, 100, 66, 88, 48, 203, 41, 115, 240, 8, 196, 110, 100,
  196, 225, 202, 97, 33, 6, 227, 25, 233, 8, 182, 124, 132, 63, 100, 188, 47, 120, 21, 210, 14, 4,
])
const tamperedBytes = new Uint8Array(encryptedBytes)
tamperedBytes[17] ^= 1
const plaintextBytes = Uint8Array.from([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
  0, 255, 128, 64, 127,
])

async function encrypted(value: string | Uint8Array, key: Uint8Array): Promise<string> {
  const result = await bitwardenCipherStringEncrypt(value, key)
  expect(result.success).toBe(true)
  return result.success ? result.data : ""
}

function attachmentClient(
  metadataByCipher: Record<string, unknown>,
  bytesByAttachment: Record<string, Uint8Array | null>,
) {
  return webSettingsApiClientCreate({
    fetch: async (input) => {
      const url = String(input)
      const cipherMatch = /\/api\/ciphers\/([^/]+)/.exec(url)
      const cipherId = cipherMatch?.[1]
      if (url.endsWith("/attachments") && cipherId !== undefined) {
        const metadata = metadataByCipher[cipherId]
        if (metadata === undefined) return new Response("Not found", { status: 404 })
        return new Response(JSON.stringify(metadata), { status: 200, headers: { "content-type": "application/json" } })
      }
      const attachmentMatch = /\/attachment\/([^/]+)\/data$/.exec(url)
      const attachmentId = attachmentMatch?.[1]
      const bytes = attachmentId === undefined ? undefined : bytesByAttachment[attachmentId]
      if (bytes === undefined || bytes === null) return new Response("Not found", { status: 404 })
      return new Response(bytes, { status: 200, headers: { "content-type": "application/octet-stream" } })
    },
  })
}

test("collects legacy attachment bytes and returns only sanitized archive entries", async () => {
  const syncData = {
    folders: [],
    ciphers: [
      {
        id: "cipher-id",
        organizationId: null,
        type: 1,
        name: await encrypted("Personal / Login", userKey),
      },
    ],
  }
  const fileName = await encrypted("report?.bin", attachmentKey)
  const result = await bitwardenAttachmentZipEntriesCollect({
    accessToken: "access-token",
    apiClient: attachmentClient(
      {
        "cipher-id": {
          data: [
            { fileName, id: "attachment-id", key: null, object: "attachment", size: String(encryptedBytes.length) },
          ],
          object: "list",
        },
      },
      { "attachment-id": encryptedBytes },
    ),
    syncData,
    userKey,
  })

  expect(result).toEqual({
    success: true,
    data: {
      entries: [{ path: "attachments/Personal _ Login/report_.bin", data: plaintextBytes }],
      skippedAttachmentCount: 0,
      warnings: [],
    },
  })
  if (result.success) {
    expect(Object.keys(result.data.entries[0] ?? {})).toEqual(["path", "data"])
    expect(JSON.stringify(result.data.entries)).not.toContain("attachment-id")
    expect(JSON.stringify(result.data.entries)).not.toContain("access-token")
  }
})

test("unwraps per-attachment keys and assigns deterministic collision suffixes", async () => {
  const cipherKey = new Uint8Array(64).fill(9)
  const wrappedCipherKey = await encrypted(new Uint8Array(cipherKey), userKey)
  const wrappedAttachmentKey = await encrypted(new Uint8Array(attachmentKey), cipherKey)
  const fileName = await encrypted("report?.bin", attachmentKey)
  const syncData = {
    folders: [],
    ciphers: [
      {
        id: "cipher-id",
        organizationId: null,
        key: wrappedCipherKey,
        type: 3,
        name: await encrypted("Personal / Login", cipherKey),
      },
    ],
  }

  const result = await bitwardenAttachmentZipEntriesCollect({
    accessToken: "access-token",
    apiClient: attachmentClient(
      {
        "cipher-id": {
          data: [
            { fileName, id: "attachment-1", key: wrappedAttachmentKey, object: "attachment", size: "100" },
            { fileName, id: "attachment-2", key: wrappedAttachmentKey, object: "attachment", size: "100" },
          ],
          object: "list",
        },
      },
      { "attachment-1": encryptedBytes, "attachment-2": encryptedBytes },
    ),
    syncData,
    userKey,
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.entries.map((entry) => entry.path)).toEqual([
    "attachments/Personal _ Login/report_.bin",
    "attachments/Personal _ Login/report__1.bin",
  ])
  expect(result.data.entries.map((entry) => entry.data)).toEqual([plaintextBytes, plaintextBytes])
  const serializedEntries = JSON.stringify(result.data.entries)
  expect(serializedEntries).not.toContain("attachment-1")
  expect(serializedEntries).not.toContain("attachment-2")
  expect(serializedEntries).not.toContain(wrappedAttachmentKey)
})

test("filters organization, trashed, and unsupported items and skips attachment failures", async () => {
  const validName = await encrypted("Valid", userKey)
  const syncData = {
    folders: [],
    ciphers: [
      { id: "organization-id", organizationId: "org-id", type: 1, name: validName },
      { id: "trashed-id", organizationId: null, deletedDate: "2026-08-31T12:00:00.000Z", type: 1, name: validName },
      { id: "unsupported-id", organizationId: null, type: 5, name: validName },
      { id: "valid-id", organizationId: null, type: 1, name: validName },
      { id: "metadata-failure-id", organizationId: null, type: 1, name: validName },
    ],
  }
  const fileName = await encrypted("report.bin", userKey)
  const result = await bitwardenAttachmentZipEntriesCollect({
    accessToken: "access-token",
    apiClient: attachmentClient(
      {
        "valid-id": {
          data: [
            { fileName, id: "good-attachment", key: null, object: "attachment", size: "100" },
            { fileName, id: "tampered-attachment", key: null, object: "attachment", size: "100" },
            { fileName, id: "missing-attachment", key: null, object: "attachment", size: "100" },
          ],
          object: "list",
        },
      },
      { "good-attachment": encryptedBytes, "tampered-attachment": tamperedBytes },
    ),
    syncData,
    userKey,
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.entries.map((entry) => entry.path)).toEqual(["attachments/Valid/report.bin"])
  expect(result.data.skippedAttachmentCount).toBe(3)
  expect(result.data.warnings).toEqual([
    "3 attachments were omitted because they could not be downloaded or decrypted.",
  ])
})

test("uses Bitwarden-compatible names while preventing reserved and duplicate archive paths", async () => {
  const fileName = await encrypted("CON.txt", userKey)
  const cipherName = await encrypted("CON", userKey)
  const syncData = {
    folders: [],
    ciphers: [
      { id: "cipher-one", organizationId: null, type: 1, name: cipherName },
      { id: "cipher-two", organizationId: null, type: 1, name: cipherName },
    ],
  }
  const metadata = (id: string) => ({
    data: [{ fileName, id, key: null, object: "attachment", size: "100" }],
    object: "list",
  })

  const result = await bitwardenAttachmentZipEntriesCollect({
    accessToken: "access-token",
    apiClient: attachmentClient(
      { "cipher-one": metadata("attachment-one"), "cipher-two": metadata("attachment-two") },
      { "attachment-one": encryptedBytes, "attachment-two": encryptedBytes },
    ),
    syncData,
    userKey,
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.entries.map((entry) => entry.path)).toEqual([
    "attachments/CON_/CON_.txt",
    "attachments/CON__1/CON_.txt",
  ])
})
