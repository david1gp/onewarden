import { type Result } from "#result"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { totpCodeCreateAtCounter } from "./totpCodeCreateAtCounter.js"
import { totpSecretParse } from "./totpSecretParse.js"

export async function totpCodeCreate(value: string, nowSeconds = Date.now() / 1_000): Promise<Result<string>> {
  const op = "totpCodeCreate"
  const secretResult = totpSecretParse(value)
  if (!secretResult.success) return resultErrorCreate(op, secretResult.errorMessage)
  if (!Number.isFinite(nowSeconds) || nowSeconds < 0) return resultErrorCreate(op, "Invalid TOTP time.")
  const counter = Math.floor(nowSeconds / secretResult.data.period)
  if (!Number.isSafeInteger(counter)) return resultErrorCreate(op, "Invalid TOTP counter.")
  const codeResult = await totpCodeCreateAtCounter(secretResult.data, counter)
  if (codeResult.success) return codeResult
  return resultErrorCreate(op, codeResult.errorMessage)
}
