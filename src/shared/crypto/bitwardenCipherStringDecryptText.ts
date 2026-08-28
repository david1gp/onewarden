import { type Result } from "#result"
import { bitwardenCipherStringDecrypt } from "./bitwardenCipherStringDecrypt.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

export async function bitwardenCipherStringDecryptText(
  encryptedString: string,
  userKey: Uint8Array,
): Promise<Result<string>> {
  const op = "bitwardenCipherStringDecryptText"
  const plaintextResult = await bitwardenCipherStringDecrypt(encryptedString, userKey)
  if (!plaintextResult.success) return plaintextResult

  try {
    return resultCreate(new TextDecoder("utf-8", { fatal: true }).decode(plaintextResult.data))
  } catch {
    return resultErrorCreate(op, "Bitwarden cipher string plaintext is not valid UTF-8.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
}
