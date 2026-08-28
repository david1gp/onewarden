import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import type { CryptoInput } from "./cryptoInput.js"

export async function hmacSha256Digest(key: CryptoInput, input: CryptoInput): Promise<Result<Uint8Array>> {
  const op = "hmacSha256Digest"
  const keyBytes = typeof key === "string" ? new TextEncoder().encode(key) : new Uint8Array(key)
  const inputBytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input)

  try {
    const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, inputBytes)
    return resultCreate(new Uint8Array(signature))
  } catch {
    return resultErrorCreate(op, "HMAC-SHA256 digest failed.")
  }
}
