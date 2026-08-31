import { type Result } from "#result"
import { base32Decode } from "../crypto/base32Decode.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import type { TotpSecret } from "./totpSecret.js"

function counterBytesCreate(counter: number): Uint8Array {
  const bytes = new Uint8Array(8)
  let value = BigInt(counter)
  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    bytes[index] = Number(value & 0xffn)
    value >>= 8n
  }
  return bytes
}

export async function totpCodeCreateAtCounter(secret: TotpSecret, counter: number): Promise<Result<string>> {
  const op = "totpCodeCreateAtCounter"
  if (!Number.isSafeInteger(counter) || counter < 0) return resultErrorCreate(op, "Invalid TOTP counter.")
  if (secret.period < 1 || !Number.isSafeInteger(secret.period)) {
    return resultErrorCreate(op, "Invalid TOTP period.")
  }

  const secretResult = base32Decode(secret.secret)
  if (!secretResult.success) return resultErrorCreate(op, "TOTP secret is not valid base32.")
  const counterBytes = counterBytesCreate(counter)
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      secretResult.data.buffer as ArrayBuffer,
      { name: "HMAC", hash: secret.algorithm },
      false,
      ["sign"],
    )
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes.buffer as ArrayBuffer))
    const offset = (digest[digest.length - 1] ?? 0) & 0x0f
    if (offset + 3 >= digest.length) return resultErrorCreate(op, "TOTP digest is invalid.")
    const binary =
      ((digest[offset] ?? 0) & 0x7f) * 2 ** 24 +
      (digest[offset + 1] ?? 0) * 2 ** 16 +
      (digest[offset + 2] ?? 0) * 2 ** 8 +
      (digest[offset + 3] ?? 0)
    const modulus = 10 ** secret.digits
    return resultCreate(String(binary % modulus).padStart(secret.digits, "0"))
  } catch {
    return resultErrorCreate(op, "TOTP code generation failed.")
  }
}
