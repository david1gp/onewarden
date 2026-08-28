import { type Result } from "#result"
import { bitwardenCipherStringEncrypt } from "../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

export async function extensionEncStringEncrypt(
  plaintext: string | Uint8Array,
  userKey: Uint8Array,
): Promise<Result<string>> {
  const op = "extensionEncStringEncrypt"
  if (typeof plaintext !== "string" && !(plaintext instanceof Uint8Array)) {
    return resultErrorCreate(op, "EncString plaintext is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (!(userKey instanceof Uint8Array) || userKey.byteLength !== 64) {
    return resultErrorCreate(op, "Bitwarden user key must be 64 bytes.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const encryptedResult = await bitwardenCipherStringEncrypt(plaintext, userKey)
  if (encryptedResult.success) return encryptedResult
  return resultErrorCreate(op, encryptedResult.errorMessage, {
    code: encryptedResult.code,
    errorData: encryptedResult.errorData,
    statusCode: encryptedResult.statusCode,
  })
}
