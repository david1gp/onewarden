import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

type CborEntry = { key: Uint8Array; value: Uint8Array }

function bytesCompare(left: Uint8Array, right: Uint8Array): number {
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    const leftByte = left[index] ?? 0
    const rightByte = right[index] ?? 0
    if (leftByte !== rightByte) return leftByte - rightByte
  }
  return left.length - right.length
}

function bytesJoin(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const output = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

function lengthHeader(major: number, length: number): Result<Uint8Array> {
  if (!Number.isSafeInteger(length) || length < 0)
    return resultErrorCreate("extensionCborEncode", "CBOR length is invalid.")
  if (length < 24) return resultCreate(Uint8Array.from([(major << 5) | length]))
  if (length <= 0xff) return resultCreate(Uint8Array.from([(major << 5) | 24, length]))
  if (length <= 0xffff) {
    return resultCreate(Uint8Array.from([(major << 5) | 25, length >> 8, length & 0xff]))
  }
  if (length <= 0xffffffff) {
    return resultCreate(
      Uint8Array.from([
        (major << 5) | 26,
        Math.floor(length / 0x1000000) & 0xff,
        Math.floor(length / 0x10000) & 0xff,
        Math.floor(length / 0x100) & 0xff,
        length & 0xff,
      ]),
    )
  }
  return resultCreate(Uint8Array.from([(major << 5) | 27, ...bigIntBytes(BigInt(length))]))
}

function bigIntBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8)
  let remaining = value
  for (let index = 7; index >= 0; index -= 1) {
    bytes[index] = Number(remaining & 0xffn)
    remaining >>= 8n
  }
  return bytes
}

function integerEncode(value: number): Result<Uint8Array> {
  if (!Number.isSafeInteger(value)) return resultErrorCreate("extensionCborEncode", "CBOR number is not an integer.")
  if (value >= 0) return lengthHeader(0, value)
  const magnitude = -1 - value
  if (!Number.isSafeInteger(magnitude)) return resultErrorCreate("extensionCborEncode", "CBOR number is invalid.")
  return lengthHeader(1, magnitude)
}

function textEncode(value: string): Result<Uint8Array> {
  const bytes = new TextEncoder().encode(value)
  const headerResult = lengthHeader(3, bytes.length)
  if (!headerResult.success) return headerResult
  return resultCreate(bytesJoin([headerResult.data, bytes]))
}

function byteStringEncode(value: Uint8Array): Result<Uint8Array> {
  const headerResult = lengthHeader(2, value.length)
  if (!headerResult.success) return headerResult
  return resultCreate(bytesJoin([headerResult.data, value]))
}

function arrayEncode(value: readonly unknown[]): Result<Uint8Array> {
  const headerResult = lengthHeader(4, value.length)
  if (!headerResult.success) return headerResult
  const parts: Uint8Array[] = [headerResult.data]
  for (const entry of value) {
    const entryResult = cborValueEncode(entry)
    if (!entryResult.success) return entryResult
    parts.push(entryResult.data)
  }
  return resultCreate(bytesJoin(parts))
}

function mapEntriesRead(value: Map<unknown, unknown> | Record<string, unknown>): readonly [unknown, unknown][] {
  return value instanceof Map ? [...value.entries()] : Object.entries(value)
}

function mapEncode(value: Map<unknown, unknown> | Record<string, unknown>): Result<Uint8Array> {
  const entries: CborEntry[] = []
  for (const [key, entry] of mapEntriesRead(value)) {
    const keyResult = cborValueEncode(key)
    if (!keyResult.success) return keyResult
    const valueResult = cborValueEncode(entry)
    if (!valueResult.success) return valueResult
    entries.push({ key: keyResult.data, value: valueResult.data })
  }
  entries.sort((left, right) => left.key.length - right.key.length || bytesCompare(left.key, right.key))
  const headerResult = lengthHeader(5, entries.length)
  if (!headerResult.success) return headerResult
  return resultCreate(bytesJoin([headerResult.data, ...entries.flatMap((entry) => [entry.key, entry.value])]))
}

function cborValueEncode(value: unknown): Result<Uint8Array> {
  if (value === null) return resultCreate(Uint8Array.of(0xf6))
  if (typeof value === "boolean") return resultCreate(Uint8Array.of(value ? 0xf5 : 0xf4))
  if (typeof value === "number") return integerEncode(value)
  if (typeof value === "string") return textEncode(value)
  if (value instanceof Uint8Array) return byteStringEncode(value)
  if (value instanceof ArrayBuffer) return byteStringEncode(new Uint8Array(value))
  if (Array.isArray(value)) return arrayEncode(value)
  if (value instanceof Map) return mapEncode(value)
  if (typeof value === "object" && value !== null) return mapEncode(value as Record<string, unknown>)
  return resultErrorCreate("extensionCborEncode", "CBOR value is unsupported.", {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

export function extensionCborEncode(value: unknown): Result<Uint8Array> {
  return cborValueEncode(value)
}
