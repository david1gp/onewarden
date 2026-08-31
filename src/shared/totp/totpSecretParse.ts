import { type Result } from "#result"
import { base32Decode } from "../crypto/base32Decode.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import type { TotpHashAlgorithm } from "./totpHashAlgorithm.js"
import type { TotpSecret } from "./totpSecret.js"

const defaultTotpAlgorithm: TotpHashAlgorithm = "SHA-1"
const defaultTotpDigits = 6 as const
const defaultTotpPeriod = 30

function totpSecretError(message: string): Result<TotpSecret> {
  return resultErrorCreate("totpSecretParse", message)
}

function totpAlgorithmRead(value: string | null): TotpHashAlgorithm | null {
  if (value === null) return defaultTotpAlgorithm
  if (value.trim() === "") return null
  const normalized = value.trim().toUpperCase()
  if (normalized === "SHA1" || normalized === "SHA-1") return "SHA-1"
  if (normalized === "SHA256" || normalized === "SHA-256") return "SHA-256"
  if (normalized === "SHA512" || normalized === "SHA-512") return "SHA-512"
  return null
}

function totpDigitsRead(value: string | null): 6 | 8 | null {
  if (value === null) return defaultTotpDigits
  if (value === "6") return 6
  if (value === "8") return 8
  return null
}

function totpPeriodRead(value: string | null): number | null {
  if (value === null) return defaultTotpPeriod
  if (!/^\d+$/u.test(value)) return null
  const period = Number(value)
  return Number.isSafeInteger(period) && period > 0 ? period : null
}

export function totpSecretParse(value: string): Result<TotpSecret> {
  if (value.trim() === "") return totpSecretError("TOTP secret is empty.")

  let secret = value.trim()
  let algorithm = defaultTotpAlgorithm
  let digits: 6 | 8 = defaultTotpDigits
  let period = defaultTotpPeriod

  if (secret.toLowerCase().startsWith("otpauth:")) {
    let uri: URL
    try {
      uri = new URL(secret)
    } catch {
      return totpSecretError("TOTP URI is invalid.")
    }
    if (uri.protocol !== "otpauth:" || uri.hostname.toLowerCase() !== "totp") {
      return totpSecretError("Only otpauth TOTP URIs are supported.")
    }

    const uriSecret = uri.searchParams.get("secret")?.trim() ?? ""
    if (uriSecret === "") return totpSecretError("TOTP URI has no secret.")
    secret = uriSecret
    const algorithmResult = totpAlgorithmRead(uri.searchParams.get("algorithm"))
    if (algorithmResult === null) return totpSecretError("TOTP algorithm is unsupported.")
    algorithm = algorithmResult
    const digitsResult = totpDigitsRead(uri.searchParams.get("digits"))
    if (digitsResult === null) return totpSecretError("TOTP digits must be 6 or 8.")
    digits = digitsResult
    const periodResult = totpPeriodRead(uri.searchParams.get("period"))
    if (periodResult === null) return totpSecretError("TOTP period is invalid.")
    period = periodResult
  }

  const decodedResult = base32Decode(secret)
  if (!decodedResult.success) return resultErrorCreate("totpSecretParse", "TOTP secret is not valid base32.")
  if (decodedResult.data.byteLength === 0) return resultErrorCreate("totpSecretParse", "TOTP secret is empty.")
  return resultCreate({ secret, algorithm, digits, period })
}
