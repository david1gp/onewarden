import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringDecrypt } from "./extensionEncStringDecrypt.js"

export async function extensionUserPrivateKeyDecrypt(
  encryptedPrivateKey: unknown,
  userKey: Uint8Array,
): Promise<Result<Uint8Array>> {
  const op = "extensionUserPrivateKeyDecrypt"
  const privateKeyResult = await extensionEncStringDecrypt(encryptedPrivateKey, userKey)
  if (!privateKeyResult.success) return privateKeyResult
  if (privateKeyResult.data.byteLength === 0) {
    return resultErrorCreate(op, "Decrypted RSA private key is empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return resultCreate(privateKeyResult.data)
}
