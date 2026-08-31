import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

function integerRead(value: Uint8Array, offset: number): { bytes: Uint8Array; next: number } {
  let start = offset
  while (start < offset + 32 && value[start] === 0) start += 1
  const body = value.subarray(start, offset + 32)
  if (body.length === 0) return { bytes: Uint8Array.of(0), next: offset + 32 }
  const needsPrefix = (body[0] ?? 0) >= 0x80
  return {
    bytes: needsPrefix ? Uint8Array.from([0, ...body]) : body,
    next: offset + 32,
  }
}

export function extensionP1363ToDer(signature: Uint8Array): Result<Uint8Array> {
  const op = "extensionP1363ToDer"
  if (signature.byteLength !== 64)
    return resultErrorCreate(op, "ES256 signatures must contain 64 bytes.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  const r = integerRead(signature, 0)
  const s = integerRead(signature, r.next)
  const bodyLength = 4 + r.bytes.length + s.bytes.length
  if (bodyLength >= 128) return resultErrorCreate(op, "ES256 DER signature is too long.")
  return resultCreate(
    Uint8Array.from([0x30, bodyLength, 0x02, r.bytes.length, ...r.bytes, 0x02, s.bytes.length, ...s.bytes]),
  )
}
