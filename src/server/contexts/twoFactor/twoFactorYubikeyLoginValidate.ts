import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { TwoFactorAdapters } from "./twoFactorAdapters.js"

export async function twoFactorYubikeyLoginValidate(
  token: string,
  data: string,
  adapters: TwoFactorAdapters,
): Promise<Result<void>> {
  const op = "twoFactorYubikeyLoginValidate"
  if (new TextEncoder().encode(token).byteLength !== 44) return resultErrorCreate(op, "Invalid Yubikey OTP length")

  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return resultErrorCreate(op, "Yubikey metadata is invalid")
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return resultErrorCreate(op, "Yubikey metadata is invalid")

  const value = parsed as { keys?: unknown; Keys?: unknown; nfc?: unknown; Nfc?: unknown }
  const keys = value.keys ?? value.Keys
  const nfc = value.nfc ?? value.Nfc
  if (!Array.isArray(keys) || !keys.every((key) => typeof key === "string") || typeof nfc !== "boolean")
    return resultErrorCreate(op, "Yubikey metadata is invalid")
  if (!keys.includes(token.slice(0, 12))) return resultErrorCreate(op, "Given Yubikey is not registered")

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
