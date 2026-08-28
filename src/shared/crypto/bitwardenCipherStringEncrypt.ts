import { type Result } from "#result"
import { aesCbcEncrypt } from "./aesCbcEncrypt.js"
import { base64Encode } from "./base64Encode.js"
import { hmacSha256Digest } from "./hmacSha256Digest.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { secureRandomBytes } from "./secureRandomBytes.js"

const USER_KEY_LENGTH = 64
const AES_IV_LENGTH = 16

function bytesConcat(left: Uint8Array, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.byteLength + right.byteLength)
  result.set(left)
  result.set(right, left.byteLength)
  return result
}

export async function bitwardenCipherStringEncrypt(
  plaintext: string | Uint8Array,
  userKey: Uint8Array,
): Promise<Result<string>> {
  const op = "bitwardenCipherStringEncrypt"
  if (userKey.byteLength !== USER_KEY_LENGTH) {
    return resultErrorCreate(op, "Bitwarden user key must be 64 bytes.")
  }

  const ivResult = secureRandomBytes(AES_IV_LENGTH)
  if (!ivResult.success) return ivResult
  const plaintextBytes = typeof plaintext === "string" ? new TextEncoder().encode(plaintext) : new Uint8Array(plaintext)
  const encryptedResult = await aesCbcEncrypt(plaintextBytes, userKey.slice(0, 32), ivResult.data)
  if (!encryptedResult.success) return encryptedResult
  const macResult = await hmacSha256Digest(userKey.slice(32), bytesConcat(ivResult.data, encryptedResult.data))
  if (!macResult.success) return macResult

  return resultCreate(
    `2.${base64Encode(ivResult.data)}|${base64Encode(encryptedResult.data)}|${base64Encode(macResult.data)}`,
  )
}
