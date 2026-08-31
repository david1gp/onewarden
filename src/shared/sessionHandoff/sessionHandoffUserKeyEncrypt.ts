import { type Result } from "#result"
import { base64UrlEncode } from "../crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../crypto/secureRandomBytes.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { sessionHandoffAdditionalDataCreate } from "./sessionHandoffAdditionalDataCreate.js"
import type { SessionHandoffEncryptedUserKey } from "./sessionHandoffEncryptedUserKeySchema.js"
import type { SessionHandoffOperation } from "./sessionHandoffOperationSchema.js"

export async function sessionHandoffUserKeyEncrypt(
  userKey: Uint8Array,
  operation: SessionHandoffOperation,
  cipherId: string | null,
): Promise<Result<{ encryptedUserKey: SessionHandoffEncryptedUserKey; transferKey: Uint8Array }>> {
  const op = "sessionHandoffUserKeyEncrypt"
  if (userKey.byteLength !== 64) {
    return resultErrorCreate(op, "User key is invalid.", { code: "platform.invalid-request", statusCode: 400 })
  }
  const transferKeyResult = secureRandomBytes(32)
  if (!transferKeyResult.success) return transferKeyResult
  const ivResult = secureRandomBytes(12)
  if (!ivResult.success) return ivResult
  const transferKey = new Uint8Array(transferKeyResult.data)
  const iv = new Uint8Array(ivResult.data)
  const additionalData = sessionHandoffAdditionalDataCreate(operation, cipherId)
  const plaintext = new Uint8Array(new ArrayBuffer(userKey.byteLength))
  plaintext.set(userKey)
  try {
    const cryptoKey = await crypto.subtle.importKey("raw", transferKey, "AES-GCM", false, ["encrypt"])
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData, tagLength: 128 },
      cryptoKey,
      plaintext,
    )
    return resultCreate({
      encryptedUserKey: {
        algorithm: "AES-GCM",
        iv: base64UrlEncode(iv),
        ciphertext: base64UrlEncode(new Uint8Array(ciphertext)),
      },
      transferKey,
    })
  } catch {
    transferKey.fill(0)
    return resultErrorCreate(op, "User key transfer encryption failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
