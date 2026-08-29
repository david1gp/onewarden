import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { twoFactorBase32Encode } from "./twoFactorBase32Encode.js"

export function twoFactorRecoveryCodeCreate(): Result<string> {
  const randomResult = secureRandomBytes(20)
  if (!randomResult.success) return resultErrorCreate("twoFactorRecoveryCodeCreate", "Recovery code generation failed.")
  return resultCreate(twoFactorBase32Encode(randomResult.data))
}
