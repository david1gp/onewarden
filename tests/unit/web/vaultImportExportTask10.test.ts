import { expect, test } from "bun:test"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { vaultExportExecute } from "../../../src/web/settings/model/vaultExportExecute.js"
import { webSettingsApiClientCreate } from "../../../src/web/settings/model/webSettingsApiClientCreate.js"

const userKey = Uint8Array.from({ length: 64 }, (_, index) => index)
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

type ParsedZipEntry = {
  path: string
  data: Uint8Array
}

function testSession(userKeyValue: Uint8Array | null = userKey): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      email: "user@example.test",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60_000,
      userId: "user-id",
      kdf: 0,
      kdfIterations: 1_000,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: "wrapped-user-key",
    }),
    getUserKey: () => userKeyValue,
  } as ReturnType<typeof webAuthSessionCreate>
}

async function encrypted(value: string): Promise<string> {
  const result = await bitwardenCipherStringEncrypt(value, userKey)
  expect(result.success).toBe(true)
  return result.success ? result.data : ""
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true)
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true)
}

function zipParse(bytes: Uint8Array): ParsedZipEntry[] {
  const endOffset = bytes.byteLength - 22
  expect(readUint32(bytes, endOffset)).toBe(0x06054b50)
  const entryCount = readUint16(bytes, endOffset + 10)
  const centralDirectorySize = readUint32(bytes, endOffset + 12)
  const centralDirectoryOffset = readUint32(bytes, endOffset + 16)
  expect(centralDirectoryOffset + centralDirectorySize).toBe(endOffset)

  const decoder = new TextDecoder("utf-8", { fatal: true })
  const entries: ParsedZipEntry[] = []
  let offset = centralDirectoryOffset
  for (let index = 0; index < entryCount; index += 1) {
    expect(readUint32(bytes, offset)).toBe(0x02014b50)
    const compressedSize = readUint32(bytes, offset + 20)
    const nameLength = readUint16(bytes, offset + 28)
    const extraLength = readUint16(bytes, offset + 30)
    const commentLength = readUint16(bytes, offset + 32)
    const localOffset = readUint32(bytes, offset + 42)
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength)
    const path = decoder.decode(nameBytes)

    expect(readUint32(bytes, localOffset)).toBe(0x04034b50)
    expect(readUint16(bytes, localOffset + 8)).toBe(0)
    expect(readUint16(bytes, localOffset + 26)).toBe(nameLength)
    const dataOffset = localOffset + 30 + nameLength
    entries.push({ path, data: bytes.slice(dataOffset, dataOffset + compressedSize) })
    offset += 46 + nameLength + extraLength + commentLength
  }
  expect(offset).toBe(centralDirectoryOffset + centralDirectorySize)
  return entries
}

function bytesContain(bytes: Uint8Array, needle: Uint8Array): boolean {
  for (let index = 0; index <= bytes.length - needle.length; index += 1) {
    let matches = true
    for (let needleIndex = 0; needleIndex < needle.length; needleIndex += 1) {
      if (bytes[index + needleIndex] !== needle[needleIndex]) {
        matches = false
        break
      }
    }
    if (matches) return true
  }
  return false
}

function attachmentApiClient(
  syncData: unknown,
  encryptedFileName: string,
  calls: { ciphers: string[]; files: string[] },
) {
  return webSettingsApiClientCreate({
    fetch: async (input) => {
      const url = String(input)
      if (url.endsWith("/api/sync")) {
        return new Response(JSON.stringify(syncData), { status: 200, headers: { "content-type": "application/json" } })
      }

      const metadataMatch = /\/api\/ciphers\/([^/]+)\/attachments$/.exec(url)
      if (metadataMatch) {
        const cipherId = decodeURIComponent(metadataMatch[1] ?? "")
        calls.ciphers.push(cipherId)
        if (cipherId !== "cipher-id") return new Response("Not found", { status: 404 })
        return new Response(
          JSON.stringify({
            data: [
              { fileName: encryptedFileName, id: "attachment-1", key: null, object: "attachment", size: "100" },
              { fileName: encryptedFileName, id: "attachment-2", key: null, object: "attachment", size: "100" },
              { fileName: encryptedFileName, id: "attachment-tampered", key: null, object: "attachment", size: "100" },
              { fileName: encryptedFileName, id: "attachment-missing", key: null, object: "attachment", size: "100" },
            ],
            object: "list",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      const bytesMatch = /\/attachment\/([^/]+)\/data$/.exec(url)
      if (bytesMatch) {
        const attachmentId = decodeURIComponent(bytesMatch[1] ?? "")
        calls.files.push(attachmentId)
        const bytes =
          attachmentId === "attachment-1" || attachmentId === "attachment-2"
            ? encryptedBytes
            : attachmentId === "attachment-tampered"
              ? tamperedBytes
              : null
        if (bytes === null) return new Response("Not found", { status: 404 })
        return new Response(bytes, { status: 200, headers: { "content-type": "application/octet-stream" } })
      }

      return new Response("Not found", { status: 404 })
    },
  })
}

test("individual ZIP export contains exact data.json and sanitized plaintext attachments", async () => {
  const encryptedName = await encrypted("Personal / Login")
  const encryptedNotes = await encrypted("Notes")
  const encryptedUri = await encrypted("https://example.test")
  const encryptedUsername = await encrypted("user")
  const encryptedPassword = await encrypted("ciphertext-secret")
  const encryptedFileName = await encrypted("report?.bin")
  const baseCipher = {
    organizationId: null,
    folderId: "folder-id",
    type: 1,
    reprompt: 0,
    name: encryptedName,
    notes: encryptedNotes,
    favorite: true,
    login: {
      uris: [{ uri: encryptedUri, match: 0 }],
      username: encryptedUsername,
      password: encryptedPassword,
      totp: null,
      passwordRevisionDate: null,
    },
    fields: [],
    passwordHistory: [],
    creationDate: "2026-08-01T12:00:00.000Z",
    revisionDate: "2026-08-31T12:00:00.000Z",
    deletedDate: null,
    archivedDate: null,
    attachments: [
      {
        fileName: "attachment-secret-name",
        id: "attachment-secret-id",
        key: "attachment-secret-key",
        url: "https://vault.example/attachments/cipher-id/attachment-secret-id?token=attachment-secret-token",
      },
    ],
  }
  const syncData = {
    folders: [{ id: "folder-id", name: await encrypted("Personal") }],
    ciphers: [
      { ...baseCipher, id: "cipher-id" },
      { ...baseCipher, id: "organization-id", organizationId: "org-id" },
      { ...baseCipher, id: "trashed-id", deletedDate: "2026-08-31T12:00:00.000Z" },
    ],
  }
  const calls = { ciphers: [] as string[], files: [] as string[] }
  const apiClient = attachmentApiClient(syncData, encryptedFileName, calls)

  const jsonResult = await vaultExportExecute({ session: testSession(), format: "json-decrypted", apiClient })
  expect(jsonResult.success).toBe(true)
  if (!jsonResult.success) return

  const zipResult = await vaultExportExecute({ session: testSession(), format: "zip", apiClient })
  expect(zipResult.success).toBe(true)
  if (!zipResult.success) return
  expect(zipResult.data.content).toBeInstanceOf(Uint8Array)
  expect(zipResult.data.filename).toMatch(/^bitwarden_export_\d{14}\.zip$/)
  expect(zipResult.data.mimeType).toBe("application/zip")
  expect(zipResult.data.skippedAttachmentCount).toBe(2)
  expect(zipResult.data.warnings).toEqual([
    "2 attachments were omitted because they could not be downloaded or decrypted.",
  ])
  expect(calls.ciphers).toEqual(["cipher-id"])
  expect(calls.files).toEqual(["attachment-1", "attachment-2", "attachment-tampered", "attachment-missing"])

  const entries = zipParse(zipResult.data.content)
  expect(entries.map((entry) => entry.path)).toEqual([
    "data.json",
    "attachments/Personal _ Login/report_.bin",
    "attachments/Personal _ Login/report__1.bin",
  ])
  expect(entries[1]?.data).toEqual(plaintextBytes)
  expect(entries[2]?.data).toEqual(plaintextBytes)
  expect(new TextDecoder().decode(entries[0]?.data)).toBe(jsonResult.data.content)

  const archiveText = new TextDecoder().decode(zipResult.data.content)
  expect(archiveText).not.toContain("attachment-1")
  expect(archiveText).not.toContain("attachment-2")
  expect(archiveText).not.toContain("attachment-tampered")
  expect(archiveText).not.toContain("attachment-missing")
  expect(archiveText).not.toContain("attachment-secret-name")
  expect(archiveText).not.toContain("attachment-secret-id")
  expect(archiveText).not.toContain("attachment-secret-key")
  expect(archiveText).not.toContain("https://vault.example/attachments/")
  expect(archiveText).not.toContain("attachment-secret-token")
  expect(archiveText).not.toContain("organization-id")
  expect(archiveText).not.toContain("trashed-id")
  expect(archiveText).not.toContain("access-token")
  expect(archiveText).not.toContain(encryptedName)
  expect(archiveText).not.toContain(encryptedFileName)
  expect(archiveText).not.toContain(encryptedPassword)
  expect(bytesContain(zipResult.data.content, encryptedBytes)).toBe(false)
})

test("individual ZIP export requires an unlocked account or master password", async () => {
  let syncCalls = 0
  const apiClient = webSettingsApiClientCreate({
    fetch: async () => {
      syncCalls += 1
      return new Response(JSON.stringify({ folders: [], ciphers: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    },
  })

  const result = await vaultExportExecute({ session: testSession(null), format: "zip", apiClient })
  expect(result.success).toBe(false)
  if (!result.success) expect(result.errorMessage).toContain("Master password is required")
  expect(syncCalls).toBe(0)
})
