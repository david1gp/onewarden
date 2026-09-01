import { expect, test } from "bun:test"
import { zipStoreCreate } from "../../../../src/shared/zip/zipStoreCreate.js"

type ParsedZipEntry = {
  path: string
  data: Uint8Array
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true)
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true)
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
    expect(readUint16(bytes, offset + 8)).toBe(0x0800)
    expect(readUint16(bytes, offset + 10)).toBe(0)
    const crc = readUint32(bytes, offset + 16)
    const compressedSize = readUint32(bytes, offset + 20)
    const uncompressedSize = readUint32(bytes, offset + 24)
    const nameLength = readUint16(bytes, offset + 28)
    const extraLength = readUint16(bytes, offset + 30)
    const commentLength = readUint16(bytes, offset + 32)
    const localOffset = readUint32(bytes, offset + 42)
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength)
    const path = decoder.decode(nameBytes)

    expect(readUint32(bytes, localOffset)).toBe(0x04034b50)
    expect(readUint16(bytes, localOffset + 6)).toBe(0x0800)
    expect(readUint16(bytes, localOffset + 8)).toBe(0)
    expect(readUint16(bytes, localOffset + 26)).toBe(nameLength)
    const localNameOffset = localOffset + 30
    expect(bytes.subarray(localNameOffset, localNameOffset + nameLength)).toEqual(nameBytes)
    const dataOffset = localNameOffset + nameLength
    const data = bytes.slice(dataOffset, dataOffset + compressedSize)
    expect(compressedSize).toBe(uncompressedSize)
    expect(crc32(data)).toBe(crc)
    entries.push({ path, data })
    offset += 46 + nameLength + extraLength + commentLength
  }
  expect(offset).toBe(centralDirectoryOffset + centralDirectorySize)
  return entries
}

test("creates a ZIP store archive with UTF-8 names and binary bytes", () => {
  const text = new TextEncoder().encode('{"encrypted":false}')
  const binary = Uint8Array.from([0, 1, 2, 127, 128, 254, 255])
  const result = zipStoreCreate([
    { path: "data.json", data: text },
    { path: "attachments/Beispiel-文件-é.bin", data: binary },
  ])

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(zipParse(result.data)).toEqual([
    { path: "data.json", data: text },
    { path: "attachments/Beispiel-文件-é.bin", data: binary },
  ])
})

test("creates a valid empty ZIP archive", () => {
  const result = zipStoreCreate([])

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(zipParse(result.data)).toEqual([])
})

test("rejects unsafe and duplicate entry paths", () => {
  for (const path of ["../secret", "/absolute", "nested/../../secret", "nested\\secret", "nested//secret", ""]) {
    expect(zipStoreCreate([{ path, data: new Uint8Array() }]).success).toBe(false)
  }
  expect(
    zipStoreCreate([
      { path: "same.bin", data: new Uint8Array() },
      { path: "same.bin", data: new Uint8Array([1]) },
    ]).success,
  ).toBe(false)
})

test("rejects ZIP32 name and entry-count limits without large archive allocations", () => {
  expect(zipStoreCreate([{ path: "a".repeat(65_536), data: new Uint8Array() }]).success).toBe(false)

  const tooManyEntries = Array.from({ length: 65_536 }, (_, index) => ({
    path: `file-${index}`,
    data: new Uint8Array(),
  }))
  expect(zipStoreCreate(tooManyEntries).success).toBe(false)
})
