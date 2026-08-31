import { type Result } from "#result"
import { base32Decode } from "../../../shared/crypto/base32Decode.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function twoFactorBase32Decode(value: string): Result<Uint8Array> {
  const op = "twoFactorBase32Decode"
  const result = base32Decode(value)
  if (result.success) return result
  return resultErrorCreate(op, result.errorMessage)
}
