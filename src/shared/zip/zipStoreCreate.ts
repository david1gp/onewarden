import type { Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import type { ZipStoreEntry } from "./zipStoreEntry.js"

const ZIP32_MAX = 0xffffffff
const ZIP16_MAX = 0xffff
const LOCAL_FILE_HEADER_LENGTH = 30
const CENTRAL_DIRECTORY_HEADER_LENGTH = 46
const END_OF_CENTRAL_DIRECTORY_LENGTH = 22
const UTF8_FLAG = 0x0800
const ZIP_VERSION_NEEDED = 20
const DOS_DATE = 0x0021

type EncodedZipStoreEntry = {
  name: Uint8Array
  data: Uint8Array
  crc32: number
  localOffset: number
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function unsafePath(path: string): boolean {
  if (path.length === 0 || path.includes("\\") || path.includes("\u0000")) return true
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) return true
  return path.split("/").some((segment) => segment.length === 0 || segment === "." || segment === "..")
}

function pathKey(bytes: Uint8Array): string {
  let key = ""
  for (const byte of bytes) key += String.fromCharCode(byte)
  return key
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true)
}

export function zipStoreCreate(entries: readonly ZipStoreEntry[]): Result<Uint8Array> {
  const op = "zipStoreCreate"
  if (!Array.isArray(entries) || entries.length > ZIP16_MAX) {
    return resultErrorCreate(op, "ZIP entry count exceeds the ZIP32 limit.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const textEncoder = new TextEncoder()
  const encodedEntries: EncodedZipStoreEntry[] = []
  const paths = new Set<string>()
  let localDirectorySize = 0
  let centralDirectorySize = 0

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      return resultErrorCreate(op, "ZIP entry is invalid.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (typeof entry.path !== "string" || unsafePath(entry.path)) {
      return resultErrorCreate(op, "ZIP entry path is unsafe.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (!(entry.data instanceof Uint8Array)) {
      return resultErrorCreate(op, "ZIP entry data must be a Uint8Array.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    const name = textEncoder.encode(entry.path)
    if (name.byteLength === 0 || name.byteLength > ZIP16_MAX) {
      return resultErrorCreate(op, "ZIP entry path exceeds the ZIP32 name limit.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    const nameKey = pathKey(name)
    if (paths.has(nameKey)) {
      return resultErrorCreate(op, "ZIP entry paths must be unique.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    paths.add(nameKey)

    if (entry.data.byteLength > ZIP32_MAX) {
      return resultErrorCreate(op, "ZIP entry data exceeds the ZIP32 size limit.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    const localEntrySize = LOCAL_FILE_HEADER_LENGTH + name.byteLength + entry.data.byteLength
    const nextLocalDirectorySize = localDirectorySize + localEntrySize
    const centralEntrySize = CENTRAL_DIRECTORY_HEADER_LENGTH + name.byteLength
    const nextCentralDirectorySize = centralDirectorySize + centralEntrySize
    if (
      localEntrySize > ZIP32_MAX ||
      nextLocalDirectorySize > ZIP32_MAX ||
      nextCentralDirectorySize > ZIP32_MAX ||
      nextLocalDirectorySize + nextCentralDirectorySize + END_OF_CENTRAL_DIRECTORY_LENGTH > ZIP32_MAX
    ) {
      return resultErrorCreate(op, "ZIP archive exceeds the ZIP32 size limit.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    encodedEntries.push({
      name,
      data: entry.data,
      crc32: crc32(entry.data),
      localOffset: localDirectorySize,
    })
    localDirectorySize = nextLocalDirectorySize
    centralDirectorySize = nextCentralDirectorySize
  }

  const archiveSize = localDirectorySize + centralDirectorySize + END_OF_CENTRAL_DIRECTORY_LENGTH
  if (archiveSize > ZIP32_MAX) {
    return resultErrorCreate(op, "ZIP archive exceeds the ZIP32 size limit.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  let archive: Uint8Array
  try {
    archive = new Uint8Array(archiveSize)
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength)
    let offset = 0

    for (const entry of encodedEntries) {
      writeUint32(view, offset, 0x04034b50)
      writeUint16(view, offset + 4, ZIP_VERSION_NEEDED)
      writeUint16(view, offset + 6, UTF8_FLAG)
      writeUint16(view, offset + 8, 0)
      writeUint16(view, offset + 10, 0)
      writeUint16(view, offset + 12, DOS_DATE)
      writeUint32(view, offset + 14, entry.crc32)
      writeUint32(view, offset + 18, entry.data.byteLength)
      writeUint32(view, offset + 22, entry.data.byteLength)
      writeUint16(view, offset + 26, entry.name.byteLength)
      writeUint16(view, offset + 28, 0)
      archive.set(entry.name, offset + LOCAL_FILE_HEADER_LENGTH)
      archive.set(entry.data, offset + LOCAL_FILE_HEADER_LENGTH + entry.name.byteLength)
      offset += LOCAL_FILE_HEADER_LENGTH + entry.name.byteLength + entry.data.byteLength
    }

    const centralDirectoryOffset = offset
    for (const entry of encodedEntries) {
      writeUint32(view, offset, 0x02014b50)
      writeUint16(view, offset + 4, ZIP_VERSION_NEEDED)
      writeUint16(view, offset + 6, ZIP_VERSION_NEEDED)
      writeUint16(view, offset + 8, UTF8_FLAG)
      writeUint16(view, offset + 10, 0)
      writeUint16(view, offset + 12, 0)
      writeUint16(view, offset + 14, DOS_DATE)
      writeUint32(view, offset + 16, entry.crc32)
      writeUint32(view, offset + 20, entry.data.byteLength)
      writeUint32(view, offset + 24, entry.data.byteLength)
      writeUint16(view, offset + 28, entry.name.byteLength)
      writeUint16(view, offset + 30, 0)
      writeUint16(view, offset + 32, 0)
      writeUint16(view, offset + 34, 0)
      writeUint16(view, offset + 36, 0)
      writeUint32(view, offset + 38, 0)
      writeUint32(view, offset + 42, entry.localOffset)
      archive.set(entry.name, offset + CENTRAL_DIRECTORY_HEADER_LENGTH)
      offset += CENTRAL_DIRECTORY_HEADER_LENGTH + entry.name.byteLength
    }

    writeUint32(view, offset, 0x06054b50)
    writeUint16(view, offset + 4, 0)
    writeUint16(view, offset + 6, 0)
    writeUint16(view, offset + 8, encodedEntries.length)
    writeUint16(view, offset + 10, encodedEntries.length)
    writeUint32(view, offset + 12, centralDirectorySize)
    writeUint32(view, offset + 16, centralDirectoryOffset)
    writeUint16(view, offset + 20, 0)
    return resultCreate(archive)
  } catch {
    return resultErrorCreate(op, "ZIP archive could not be created.")
  }
}
