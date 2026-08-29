import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

const twoFactorBase32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function twoFactorBase32Decode(value: string): Result<Uint8Array> {
  const op = "twoFactorBase32Decode"
  const normalized = value.replaceAll("=", "").replaceAll(" ", "").toUpperCase()
  if (normalized === "" || !/^[A-Z2-7]+$/u.test(normalized)) return resultErrorCreate(op, "Invalid base32 value.")

  const bytes: number[] = []
  let buffer = 0
  let bits = 0
  for (const character of normalized) {
    const digit = twoFactorBase32Alphabet.indexOf(character)
    if (digit < 0) return resultErrorCreate(op, "Invalid base32 value.")
    buffer = (buffer << 5) | digit
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 0xff)
    }
  }
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) return resultErrorCreate(op, "Invalid base32 value.")
  return resultCreate(Uint8Array.from(bytes))
}
