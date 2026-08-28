import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import type { CryptoInput } from "./cryptoInput.js"
import { hmacSha256Digest } from "./hmacSha256Digest.js"

export async function hmacSha256Hex(key: CryptoInput, input: CryptoInput): Promise<Result<string>> {
  const op = "hmacSha256Hex"
  const digest = await hmacSha256Digest(key, input)
  if (!digest.success) return resultErrorCreate(op, "HMAC-SHA256 digest failed.")

  let hex = ""
  for (const byte of digest.data) hex += byte.toString(16).padStart(2, "0")
  return resultCreate(hex)
}
