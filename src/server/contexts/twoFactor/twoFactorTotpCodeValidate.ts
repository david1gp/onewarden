import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { twoFactorTotpCodeCreate } from "./twoFactorTotpCodeCreate.js"

export async function twoFactorTotpCodeValidate(
  secret: string,
  token: string,
  nowSeconds: number,
  lastUsed: number,
  disableTimeDrift: boolean,
): Promise<Result<number>> {
  const op = "twoFactorTotpCodeValidate"
  if (!/^\d{6}$/u.test(token)) return resultErrorCreate(op, "TOTP code is not a number")
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 0) return resultErrorCreate(op, "Invalid TOTP time.")
  if (!Number.isSafeInteger(lastUsed) || lastUsed < 0) return resultErrorCreate(op, "Invalid TOTP state.")
  const currentStep = Math.floor(nowSeconds / 30)
  const drift = disableTimeDrift ? 0 : 1
  for (let offset = -drift; offset <= drift; offset += 1) {
    const step = currentStep + offset
    if (step < 0) continue
    const codeResult = await twoFactorTotpCodeCreate(secret, step)
    if (!codeResult.success) return codeResult
    if (!constantTimeStringsEqual(codeResult.data, token)) continue
    if (step <= lastUsed) return resultErrorCreate(op, "Invalid TOTP code! This code has already been used.")
    return resultCreate(step)
  }
  return resultErrorCreate(op, "Invalid TOTP code")
}
