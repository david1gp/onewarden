import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringDecrypt } from "./extensionEncStringDecrypt.js"

export async function extensionEncStringDecryptText(
  encryptedString: unknown,
  userKey: Uint8Array,
): Promise<Result<string>> {
  const op = "extensionEncStringDecryptText"
  const plaintextResult = await extensionEncStringDecrypt(encryptedString, userKey)
  if (!plaintextResult.success) return plaintextResult

  try {
    return resultCreate(new TextDecoder("utf-8", { fatal: true }).decode(plaintextResult.data))
  } catch {
    return resultErrorCreate(op, "EncString plaintext is not valid UTF-8.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
}
