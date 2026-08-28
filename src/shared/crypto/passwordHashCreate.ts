import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

const PASSWORD_HASH_ITERATIONS_DEFAULT = 600_000
const PASSWORD_HASH_LENGTH_BITS = 256

export async function passwordHashCreate(
  password: string,
  salt: Uint8Array,
  iterations = PASSWORD_HASH_ITERATIONS_DEFAULT,
): Promise<Result<Uint8Array>> {
  const op = "passwordHashCreate"
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 0xffff_ffff) {
    return resultErrorCreate(op, "Password hash iterations must be a positive 32-bit integer.")
  }

  try {
    const passwordKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
      "deriveBits",
    ])
    const hash = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations },
      passwordKey,
      PASSWORD_HASH_LENGTH_BITS,
    )
    return resultCreate(new Uint8Array(hash))
  } catch {
    return resultErrorCreate(op, "Password hash derivation failed.")
  }
}
