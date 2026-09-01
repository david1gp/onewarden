import * as v from "valibot"
import { type Result } from "#result"
import {
  type BitwardenEncryptedFolder,
  bitwardenEncryptedFolderSchema,
} from "../../shared/api/bitwardenEncryptedFolderSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringDecryptText } from "./extensionEncStringDecryptText.js"
import { type ExtensionFolder, extensionFolderSchema } from "./extensionFolderSchema.js"

export async function extensionFolderDecrypt(
  folder: BitwardenEncryptedFolder,
  userKey: Uint8Array,
): Promise<Result<ExtensionFolder>> {
  const op = "extensionFolderDecrypt"
  const parsed = v.safeParse(bitwardenEncryptedFolderSchema, folder)
  if (!parsed.success) {
    return resultErrorCreate(op, "Encrypted extension folder is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const nameResult = /^2\./u.test(parsed.output.name)
    ? await extensionEncStringDecryptText(parsed.output.name, userKey)
    : resultCreate(parsed.output.name)
  if (!nameResult.success) return nameResult
  const decryptedResult = v.safeParse(extensionFolderSchema, { ...parsed.output, name: nameResult.data })
  if (!decryptedResult.success) {
    return resultErrorCreate(op, "Decrypted extension folder is invalid.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  return resultCreate(decryptedResult.output)
}
