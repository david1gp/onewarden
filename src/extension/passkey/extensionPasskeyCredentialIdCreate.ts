import { type Result } from "#result"
import { secureRandomBytes } from "../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../shared/result/resultCreate.js"

export function extensionPasskeyCredentialIdCreate(): Result<{ id: string; bytes: Uint8Array }> {
  const randomResult = secureRandomBytes(16)
  if (!randomResult.success) return randomResult
  const bytes = randomResult.data
  bytes[6] = (bytes[6] ?? 0) & 0x0f
  bytes[6] = (bytes[6] ?? 0) | 0x40
  bytes[8] = (bytes[8] ?? 0) & 0x3f
  bytes[8] = (bytes[8] ?? 0) | 0x80
  const hexadecimal = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  const id = `${hexadecimal.slice(0, 8)}-${hexadecimal.slice(8, 12)}-${hexadecimal.slice(12, 16)}-${hexadecimal.slice(16, 20)}-${hexadecimal.slice(20)}`
  return resultCreate({ id, bytes: Uint8Array.from(bytes) })
}
