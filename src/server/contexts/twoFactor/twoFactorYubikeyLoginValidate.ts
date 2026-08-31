import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { TwoFactorAdapters } from "./twoFactorAdapters.js"
import { twoFactorPersistedJsonParse } from "./twoFactorPersistedJsonParse.js"
import { twoFactorYubikeyDataSchema } from "./twoFactorYubikeyDataSchema.js"

export async function twoFactorYubikeyLoginValidate(
  token: string,
  data: string,
  adapters: TwoFactorAdapters,
): Promise<Result<void>> {
  const op = "twoFactorYubikeyLoginValidate"
  if (new TextEncoder().encode(token).byteLength !== 44) return resultErrorCreate(op, "Invalid Yubikey OTP length")

  const dataResult = twoFactorPersistedJsonParse(op, data, twoFactorYubikeyDataSchema, "Yubikey metadata is invalid")
  if (!dataResult.success) return dataResult
  if (!dataResult.data.keys.includes(token.slice(0, 12)))
    return resultErrorCreate(op, "Given Yubikey is not registered")

  let validationResult: Result<void> | undefined
  try {
    validationResult = await adapters.yubikey?.otpValidate?.(token)
  } catch {
    return resultErrorCreate(op, "Yubikey OTP validation failed")
  }
  if (validationResult === undefined) return resultErrorCreate(op, "Yubikey adapter unavailable")
  if (!validationResult.success) return validationResult
  return resultCreate(undefined)
}
