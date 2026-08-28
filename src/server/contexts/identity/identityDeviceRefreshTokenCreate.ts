import { type Result } from "#result"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"

export function identityDeviceRefreshTokenCreate(): Result<string> {
  const randomResult = secureRandomBytes(64)
  if (!randomResult.success) return randomResult
  return resultCreate(base64UrlEncode(randomResult.data))
}
