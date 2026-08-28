import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import type { CryptoInput } from "./cryptoInput.js"
import { sha256Digest } from "./sha256Digest.js"

export async function sha256Hex(input: CryptoInput): Promise<Result<string>> {
  const op = "sha256Hex"
  const digest = await sha256Digest(input)
  if (!digest.success) return resultErrorCreate(op, "SHA-256 digest failed.")

  let hex = ""
  for (const byte of digest.data) hex += byte.toString(16).padStart(2, "0")
  return resultCreate(hex)
}
