import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

const RANDOM_VALUES_MAX_LENGTH = 65_536

export function secureRandomBytes(length: number): Result<Uint8Array> {
  const op = "secureRandomBytes"
  if (!Number.isSafeInteger(length) || length < 0) {
    return resultErrorCreate(op, "Random byte length must be a non-negative safe integer.")
  }

  try {
    const bytes = new Uint8Array(length)
    for (let offset = 0; offset < bytes.length; offset += RANDOM_VALUES_MAX_LENGTH) {
      crypto.getRandomValues(bytes.subarray(offset, offset + RANDOM_VALUES_MAX_LENGTH))
    }
    return resultCreate(bytes)
  } catch {
    return resultErrorCreate(op, "Secure random byte generation failed.")
  }
}
