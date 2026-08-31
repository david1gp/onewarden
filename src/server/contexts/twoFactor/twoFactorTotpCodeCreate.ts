import { type Result } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { totpCodeCreateAtCounter } from "../../../shared/totp/totpCodeCreateAtCounter.js"
import { totpSecretParse } from "../../../shared/totp/totpSecretParse.js"

export async function twoFactorTotpCodeCreate(secret: string, timeStep: number): Promise<Result<string>> {
  const op = "twoFactorTotpCodeCreate"
  const secretResult = totpSecretParse(secret)
  if (!secretResult.success) return secretResult
  if (!Number.isSafeInteger(timeStep) || timeStep < 0) return resultErrorCreate(op, "Invalid TOTP time step.")
  const codeResult = await totpCodeCreateAtCounter(secretResult.data, timeStep)
  if (codeResult.success) return codeResult
  return resultErrorCreate(op, codeResult.errorMessage)
}
