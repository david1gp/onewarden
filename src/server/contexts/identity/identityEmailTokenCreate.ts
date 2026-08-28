import type { Result } from "#result"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

export function identityEmailTokenCreate(): Result<string> {
  for (;;) {
    const bytesResult = secureRandomBytes(4)
    if (!bytesResult.success) return bytesResult
    const bytes = bytesResult.data
    const value = (((bytes[0]! * 256 + bytes[1]!) * 256 + bytes[2]!) * 256 + bytes[3]!) >>> 0
    if (value >= 4_294_960_000) continue
    return resultCreate(String(value % 1_000_000).padStart(6, "0"))
  }
}
