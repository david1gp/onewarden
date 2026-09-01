import * as v from "valibot"
import { type Result } from "#result"
import { bitwardenEncryptedFolderSchema, type BitwardenEncryptedFolder } from "../../shared/api/bitwardenEncryptedFolderSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringEncrypt } from "./extensionEncStringEncrypt.js"
import { type ExtensionFolder, extensionFolderSchema } from "./extensionFolderSchema.js"

export async function extensionFolderEncrypt(
  folder: ExtensionFolder,
  userKey: Uint8Array,
): Promise<Result<BitwardenEncryptedFolder>> {
  const op = "extensionFolderEncrypt"
  const parsed = v.safeParse(extensionFolderSchema, folder)
  if (!parsed.success) {
    return resultErrorCreate(op, "Extension folder is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const nameResult = await extensionEncStringEncrypt(parsed.output.name, userKey)
  if (!nameResult.success) return nameResult
  const encrypted = { ...parsed.output, name: nameResult.data }
  const encryptedResult = v.safeParse(bitwardenEncryptedFolderSchema, encrypted)
  if (!encryptedResult.success) {
    return resultErrorCreate(op, "Encrypted extension folder is invalid.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  return resultCreate(encryptedResult.output)
}
