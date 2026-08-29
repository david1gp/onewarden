import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"

export function twoFactorEmailTokenCreate(size: number): Result<string> {
  const op = "twoFactorEmailTokenCreate"
  if (!Number.isSafeInteger(size) || size < 1 || size > 32) return resultErrorCreate(op, "Invalid email token size.")
  const digits: number[] = []
  const limit = 256 - (256 % 10)
  while (digits.length < size) {
    const bytesResult = secureRandomBytes(size - digits.length)
    if (!bytesResult.success) return bytesResult
    for (const byte of bytesResult.data) {
      if (byte < limit) digits.push(byte % 10)
      if (digits.length === size) break
    }
  }
  return resultCreate(digits.join(""))
}
