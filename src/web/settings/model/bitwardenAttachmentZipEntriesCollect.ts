import * as v from "valibot"
import type { Result } from "#result"
import { extensionCipherKeyResolve } from "../../../extension/crypto/extensionCipherKeyResolve.js"
import { extensionEncStringDecrypt } from "../../../extension/crypto/extensionEncStringDecrypt.js"
import type { AttachmentExportMetadata } from "../../../shared/api/attachmentExportMetadataSchema.js"
import type { BitwardenEncryptedLoginCipher } from "../../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { bitwardenAttachmentBinaryDecrypt } from "../../../shared/crypto/bitwardenAttachmentBinaryDecrypt.js"
import { bitwardenCipherStringDecryptText } from "../../../shared/crypto/bitwardenCipherStringDecryptText.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { ZipStoreEntry } from "../../../shared/zip/zipStoreEntry.js"
import { bitwardenEncryptedSyncSchema } from "./bitwardenEncryptedSyncSchema.js"
import { webSettingsApiClientCreate } from "./webSettingsApiClientCreate.js"

interface BitwardenAttachmentZipEntriesCollectOptions {
  accessToken: string
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
  syncData: unknown
  userKey: Uint8Array
}

interface BitwardenAttachmentZipEntriesCollectResult {
  entries: ZipStoreEntry[]
  skippedAttachmentCount: number
  warnings: string[]
}

const supportedCipherTypes = new Set([1, 2, 3, 4])
const unsafeNameCharacters = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"])
const windowsReservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

function invalidInputResult<T>(message: string): Result<T> {
  return resultErrorCreate("bitwardenAttachmentZipEntriesCollect", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

function attachmentNameSanitize(
  value: string,
  fallback: string,
  dotsUnsafe = false,
  trimTrailing = true,
  protectReserved = true,
): string {
  let sanitized = ""
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0
    sanitized +=
      codePoint <= 0x1f || unsafeNameCharacters.has(character) || (dotsUnsafe && character === ".") ? "_" : character
  }
  sanitized = sanitized.replace(/__+/g, "_")
  if (trimTrailing) sanitized = sanitized.replace(/[. ]+$/g, "")
  if (sanitized === "" || sanitized === "." || sanitized === "..") return fallback
  if (!protectReserved) return sanitized
  const reservedMatch = windowsReservedName.exec(sanitized)
  if (reservedMatch !== null) return `${reservedMatch[1]}_${reservedMatch[2] ?? ""}`
  return sanitized
}

function attachmentFileNameSanitize(fileName: string): string {
  const fileNameParts = fileName.split(".")
  const hasExtension = fileNameParts.length > 1
  const base = hasExtension ? fileNameParts.slice(0, -1).join("") : fileName
  const extension = hasExtension ? (fileNameParts.at(-1) ?? "") : ""
  const sanitizedBase = attachmentNameSanitize(base, "", true, false)
  const sanitizedExtension = extension === "" ? "" : attachmentNameSanitize(extension, "", false, true, false)
  const sanitized = `${sanitizedBase}${sanitizedExtension === "" ? "" : `.${sanitizedExtension}`}`
  return attachmentNameSanitize(sanitized, "attachment")
}

function attachmentFileNameParts(fileName: string): { base: string; extension: string } {
  const extensionIndex = fileName.lastIndexOf(".")
  if (extensionIndex <= 0) return { base: fileName, extension: "" }
  return { base: fileName.slice(0, extensionIndex), extension: fileName.slice(extensionIndex) }
}

function attachmentArchivePathCreate(cipherName: string, fileName: string, paths: Set<string>): string {
  const initialPath = `attachments/${cipherName}/${fileName}`
  if (!paths.has(initialPath)) {
    paths.add(initialPath)
    return initialPath
  }

  const { base, extension } = attachmentFileNameParts(fileName)
  let collisionIndex = 1
  while (true) {
    const collisionPath = `attachments/${cipherName}/${base}_${collisionIndex}${extension}`
    if (!paths.has(collisionPath)) {
      paths.add(collisionPath)
      return collisionPath
    }
    collisionIndex += 1
  }
}

function attachmentKeyLengthValidate(key: Uint8Array): Result<Uint8Array> {
  if (key.byteLength === 64) return resultCreate(key)
  key.fill(0)
  return resultErrorCreate("bitwardenAttachmentZipEntriesCollect", "Bitwarden attachment key must be 64 bytes.", {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

async function attachmentKeyResolve(
  metadata: AttachmentExportMetadata,
  cipherKey: Uint8Array,
): Promise<Result<Uint8Array>> {
  if (metadata.key === null) return resultCreate(cipherKey)
  const keyResult = await extensionEncStringDecrypt(metadata.key, cipherKey)
  if (!keyResult.success) return keyResult
  return attachmentKeyLengthValidate(keyResult.data)
}

async function attachmentZipEntryCreate(
  accessToken: string,
  apiClient: ReturnType<typeof webSettingsApiClientCreate>,
  cipherUuid: string,
  cipherName: string,
  metadata: AttachmentExportMetadata,
  cipherKey: Uint8Array,
  paths: Set<string>,
): Promise<Result<ZipStoreEntry>> {
  const op = "bitwardenAttachmentZipEntriesCollect"
  let attachmentKey: Uint8Array | undefined
  let plaintext: Uint8Array | undefined
  let plaintextReturned = false
  try {
    const attachmentKeyResult = await attachmentKeyResolve(metadata, cipherKey)
    if (!attachmentKeyResult.success) return attachmentKeyResult
    attachmentKey = attachmentKeyResult.data

    const fileNameResult = await bitwardenCipherStringDecryptText(metadata.fileName, attachmentKey)
    if (!fileNameResult.success) return fileNameResult

    const bytesResult = await apiClient.attachmentBytesGet(accessToken, cipherUuid, metadata.id)
    if (!bytesResult.success) return bytesResult
    try {
      const plaintextResult = await bitwardenAttachmentBinaryDecrypt(bytesResult.data, attachmentKey)
      if (!plaintextResult.success) return plaintextResult
      plaintext = plaintextResult.data
    } finally {
      bytesResult.data.fill(0)
    }

    if (plaintext === undefined) return resultErrorCreate(op, "Attachment plaintext is unavailable.")
    const path = attachmentArchivePathCreate(cipherName, attachmentFileNameSanitize(fileNameResult.data), paths)
    plaintextReturned = true
    return resultCreate({ path, data: plaintext })
  } catch {
    return resultErrorCreate(op, "Attachment could not be exported.")
  } finally {
    if (attachmentKey !== undefined && attachmentKey !== cipherKey) attachmentKey.fill(0)
    if (!plaintextReturned) plaintext?.fill(0)
  }
}

function skippedAttachmentWarning(count: number): string {
  return `${count} attachment${count === 1 ? " was" : "s were"} omitted because ${count === 1 ? "it" : "they"} could not be downloaded or decrypted.`
}

export async function bitwardenAttachmentZipEntriesCollect(
  options: BitwardenAttachmentZipEntriesCollectOptions,
): Promise<Result<BitwardenAttachmentZipEntriesCollectResult>> {
  if (!(options.userKey instanceof Uint8Array) || options.userKey.byteLength !== 64)
    return invalidInputResult("Bitwarden user key must be 64 bytes.")
  if (typeof options.accessToken !== "string" || options.accessToken.length === 0)
    return invalidInputResult("Access token is required to export attachments.")

  const syncResult = v.safeParse(bitwardenEncryptedSyncSchema, options.syncData)
  if (!syncResult.success)
    return invalidInputResult(`Invalid Bitwarden encrypted sync data: ${v.summarize(syncResult.issues)}`)

  const client = options.apiClient ?? webSettingsApiClientCreate()
  const entries: ZipStoreEntry[] = []
  const paths = new Set<string>()
  const cipherDirectoryCounts = new Map<string, number>()
  const cipherDirectories = new Set<string>()
  let skippedAttachmentCount = 0

  for (const cipher of syncResult.output.ciphers) {
    if (cipher.organizationId !== undefined && cipher.organizationId !== null) continue
    if (cipher.deletedDate !== undefined && cipher.deletedDate !== null) continue
    if (!supportedCipherTypes.has(cipher.type)) continue

    let metadataResult: Awaited<ReturnType<typeof client.attachmentMetadataGet>>
    try {
      metadataResult = await client.attachmentMetadataGet(options.accessToken, cipher.id)
    } catch {
      skippedAttachmentCount += 1
      continue
    }
    if (!metadataResult.success) {
      skippedAttachmentCount += 1
      continue
    }
    if (metadataResult.data.length === 0) continue

    let cipherKeyResult: Result<Uint8Array>
    try {
      cipherKeyResult = await extensionCipherKeyResolve(
        cipher as unknown as BitwardenEncryptedLoginCipher,
        options.userKey,
      )
    } catch {
      skippedAttachmentCount += metadataResult.data.length
      continue
    }
    if (!cipherKeyResult.success) {
      skippedAttachmentCount += metadataResult.data.length
      continue
    }
    const cipherKey = cipherKeyResult.data
    let cipherNameResult: Result<string>
    try {
      cipherNameResult = await bitwardenCipherStringDecryptText(cipher.name, cipherKey)
    } catch {
      if (cipherKey !== options.userKey) cipherKey.fill(0)
      skippedAttachmentCount += metadataResult.data.length
      continue
    }
    if (!cipherNameResult.success) {
      if (cipherKey !== options.userKey) cipherKey.fill(0)
      skippedAttachmentCount += metadataResult.data.length
      continue
    }

    const cipherName = attachmentCipherDirectoryCreate(cipherNameResult.data, cipherDirectoryCounts, cipherDirectories)
    try {
      for (const metadata of metadataResult.data) {
        const entryResult = await attachmentZipEntryCreate(
          options.accessToken,
          client,
          cipher.id,
          cipherName,
          metadata,
          cipherKey,
          paths,
        )
        if (!entryResult.success) {
          skippedAttachmentCount += 1
          continue
        }
        entries.push(entryResult.data)
      }
    } finally {
      if (cipherKey !== options.userKey) cipherKey.fill(0)
    }
  }

  return resultCreate({
    entries,
    skippedAttachmentCount,
    warnings: skippedAttachmentCount === 0 ? [] : [skippedAttachmentWarning(skippedAttachmentCount)],
  })
}

function attachmentCipherDirectoryCreate(
  cipherName: string,
  counts: Map<string, number>,
  directories: Set<string>,
): string {
  const occurrence = counts.get(cipherName) ?? 0
  counts.set(cipherName, occurrence + 1)
  const base = attachmentNameSanitize(cipherName, "item")
  let suffix = occurrence
  let directory = suffix === 0 ? base : `${base}_${suffix}`
  while (directories.has(directory)) {
    suffix += 1
    directory = `${base}_${suffix}`
  }
  directories.add(directory)
  return directory
}
