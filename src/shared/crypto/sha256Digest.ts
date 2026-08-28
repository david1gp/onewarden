import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import type { CryptoInput } from "./cryptoInput.js"

export async function sha256Digest(input: CryptoInput): Promise<Result<Uint8Array>> {
  const op = "sha256Digest"
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input)

  try {
    const digest = await crypto.subtle.digest("SHA-256", bytes)
    return resultCreate(new Uint8Array(digest))
  } catch {
    return resultErrorCreate(op, "SHA-256 digest failed.")
  }
}
