import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function base32Decode(value: string): Result<Uint8Array> {
  const op = "base32Decode"
  const normalized = value.replace(/[\t\n\r ]/gu, "").toUpperCase()
  if (normalized === "") return resultErrorCreate(op, "Invalid base32 value.")

  const paddingIndex = normalized.indexOf("=")
  const encoded = paddingIndex < 0 ? normalized : normalized.slice(0, paddingIndex)
  const padding = paddingIndex < 0 ? "" : normalized.slice(paddingIndex)
  if (padding !== "" && !/^=+$/u.test(padding)) return resultErrorCreate(op, "Invalid base32 value.")
  if (!/^[A-Z2-7]+$/u.test(encoded)) return resultErrorCreate(op, "Invalid base32 value.")

  const encodedRemainder = encoded.length % 8
  if (encodedRemainder === 1 || encodedRemainder === 3 || encodedRemainder === 6) {
    return resultErrorCreate(op, "Invalid base32 value.")
  }
  const expectedPadding = (8 - encodedRemainder) % 8
  if (padding !== "" && (normalized.length % 8 !== 0 || padding.length !== expectedPadding)) {
    return resultErrorCreate(op, "Invalid base32 value.")
  }

  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const character of encoded) {
    buffer = buffer * 32 + base32Alphabet.indexOf(character)
    bits += 5
    if (bits < 8) continue
    bits -= 8
    bytes.push(Math.floor(buffer / 2 ** bits) & 0xff)
    buffer %= 2 ** bits
  }
  if (bits > 0 && buffer !== 0) return resultErrorCreate(op, "Invalid base32 value.")
  return resultCreate(Uint8Array.from(bytes))
}
