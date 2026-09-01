import * as v from "valibot"
import { type Result } from "#result"
import {
  type BitwardenEncryptedCollection,
  bitwardenEncryptedCollectionSchema,
} from "../../shared/api/bitwardenEncryptedCollectionSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringEncrypt } from "./extensionEncStringEncrypt.js"
import { type ExtensionCollection, extensionCollectionSchema } from "./extensionCollectionSchema.js"

export async function extensionCollectionEncrypt(
  collection: ExtensionCollection,
  organizationKeys: ReadonlyMap<string, Uint8Array>,
): Promise<Result<BitwardenEncryptedCollection>> {
  const op = "extensionCollectionEncrypt"
  const parsed = v.safeParse(extensionCollectionSchema, collection)
  if (!parsed.success) {
    return resultErrorCreate(op, "Extension collection is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const organizationKey = organizationKeys.get(parsed.output.organizationId)
  if (organizationKey === undefined) {
    return resultErrorCreate(op, "Organization key is unavailable.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
  const nameResult = await extensionEncStringEncrypt(parsed.output.name, organizationKey)
  if (!nameResult.success) return nameResult
  const encryptedResult = v.safeParse(bitwardenEncryptedCollectionSchema, { ...parsed.output, name: nameResult.data })
  if (!encryptedResult.success) {
    return resultErrorCreate(op, "Encrypted extension collection is invalid.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  return resultCreate(encryptedResult.output)
}
