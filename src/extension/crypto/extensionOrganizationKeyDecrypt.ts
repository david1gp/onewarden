import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionRsaEncStringDecrypt } from "./extensionRsaEncStringDecrypt.js"

export async function extensionOrganizationKeyDecrypt(
  encryptedOrganizationKey: unknown,
  privateKeyBytes: Uint8Array,
): Promise<Result<Uint8Array>> {
  const op = "extensionOrganizationKeyDecrypt"
  const keyResult = await extensionRsaEncStringDecrypt(encryptedOrganizationKey, privateKeyBytes)
  if (!keyResult.success) return keyResult
  if (keyResult.data.byteLength !== 64) {
    return resultErrorCreate(op, "Decrypted organization key is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return resultCreate(keyResult.data)
}
