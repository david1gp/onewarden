import type { Result } from "#result"
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
  let encryptedBytes: Uint8Array | undefined
  let macBytes: Uint8Array | undefined
  try {
    const encryptionKey = userKey.slice(0, 32)
    let encryptedResult: Result<Uint8Array>
    try {
      encryptedResult = await aesCbcEncrypt(plaintextBytes, encryptionKey, ivResult.data)
    } finally {
      encryptionKey.fill(0)
    }
    if (!encryptedResult.success) return encryptedResult
    encryptedBytes = encryptedResult.data

    const authenticationInput = bytesConcat(ivResult.data, encryptedBytes)
    const authenticationKey = userKey.slice(32)
    let macResult: Result<Uint8Array>
    try {
      macResult = await hmacSha256Digest(authenticationKey, authenticationInput)
    } finally {
      authenticationKey.fill(0)
      authenticationInput.fill(0)
    }
    if (!macResult.success) return macResult
    macBytes = macResult.data

    return resultCreate(`2.${base64Encode(ivResult.data)}|${base64Encode(encryptedBytes)}|${base64Encode(macBytes)}`)
  } finally {
    plaintextBytes.fill(0)
    encryptedBytes?.fill(0)
    macBytes?.fill(0)
    ivResult.data.fill(0)
  }
}
