import * as v from "valibot"
import type { Result } from "#result"
import {
  type BitwardenEncryptedCollection,
  bitwardenEncryptedCollectionSchema,
} from "../../shared/api/bitwardenEncryptedCollectionSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { type ExtensionCollection, extensionCollectionSchema } from "./extensionCollectionSchema.js"
import { extensionEncStringDecryptText } from "./extensionEncStringDecryptText.js"

export async function extensionCollectionDecrypt(
  collection: BitwardenEncryptedCollection,
  organizationKeys: ReadonlyMap<string, Uint8Array>,
): Promise<Result<ExtensionCollection>> {
  const op = "extensionCollectionDecrypt"
  const parsed = v.safeParse(bitwardenEncryptedCollectionSchema, collection)
  if (!parsed.success) {
    return resultErrorCreate(op, "Encrypted extension collection is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const organizationKey = organizationKeys.get(parsed.output.organizationId)
  if (organizationKey === undefined && /^2\./u.test(parsed.output.name)) {
    return resultErrorCreate(op, "Organization key is unavailable.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
  const nameResult = /^2\./u.test(parsed.output.name)
    ? await extensionEncStringDecryptText(parsed.output.name, organizationKey as Uint8Array)
    : resultCreate(parsed.output.name)
  if (!nameResult.success) return nameResult
  const decryptedResult = v.safeParse(extensionCollectionSchema, { ...parsed.output, name: nameResult.data })
  if (!decryptedResult.success) {
    return resultErrorCreate(op, "Decrypted extension collection is invalid.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  return resultCreate(decryptedResult.output)
}
