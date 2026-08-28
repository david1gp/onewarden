import { type Result } from "#result"
import { bitwardenCipherStringDecrypt } from "../../shared/crypto/bitwardenCipherStringDecrypt.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

export async function extensionEncStringDecrypt(
  encryptedString: unknown,
  userKey: Uint8Array,
): Promise<Result<Uint8Array>> {
  const op = "extensionEncStringDecrypt"
  if (typeof encryptedString !== "string" || encryptedString.length === 0) {
    return resultErrorCreate(op, "EncString is invalid.", { code: "platform.invalid-request", statusCode: 400 })
  }
  if (!(userKey instanceof Uint8Array) || userKey.byteLength !== 64) {
    return resultErrorCreate(op, "Bitwarden user key must be 64 bytes.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const decryptedResult = await bitwardenCipherStringDecrypt(encryptedString, userKey)
  if (decryptedResult.success) return decryptedResult
  return resultErrorCreate(op, decryptedResult.errorMessage, {
    code: decryptedResult.code,
    errorData: decryptedResult.errorData,
    statusCode: decryptedResult.statusCode,
  })
}
