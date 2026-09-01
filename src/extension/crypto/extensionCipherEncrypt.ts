import * as v from "valibot"
import type { Result } from "#result"
import {
  type BitwardenEncryptedCipher,
  bitwardenEncryptedCipherSchema,
} from "../../shared/api/bitwardenEncryptedCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionCipherKeyResolve } from "./extensionCipherKeyResolve.js"
import { extensionCipherMap } from "./extensionCipherMap.js"
import { type ExtensionCipher, extensionCipherSchema } from "./extensionCipherSchema.js"
import { extensionEncStringEncrypt } from "./extensionEncStringEncrypt.js"
import { extensionPersonalLoginCipherEncrypt } from "./extensionPersonalLoginCipherEncrypt.js"

export async function extensionCipherEncrypt(
  cipher: ExtensionCipher,
  userKey: Uint8Array,
  organizationKeys: ReadonlyMap<string, Uint8Array> = new Map(),
): Promise<Result<BitwardenEncryptedCipher>> {
  const op = "extensionCipherEncrypt"
  const parsed = v.safeParse(extensionCipherSchema, cipher)
  if (!parsed.success) {
    return resultErrorCreate(op, "Extension cipher is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const plainCipher = parsed.output
  if (plainCipher.type === 1) {
    const loginResult = await extensionPersonalLoginCipherEncrypt(plainCipher, userKey, organizationKeys)
    if (!loginResult.success) return loginResult
    const loginParsed = v.safeParse(bitwardenEncryptedCipherSchema, loginResult.data)
    if (!loginParsed.success) {
      return resultErrorCreate(op, "Encrypted extension cipher is invalid.", {
        code: "platform.internal",
        statusCode: 500,
      })
    }
    return resultCreate(loginParsed.output)
  }

  const cipherKeyResult = await extensionCipherKeyResolve(
    plainCipher as unknown as BitwardenEncryptedCipher,
    userKey,
    organizationKeys,
  )
  if (!cipherKeyResult.success) return cipherKeyResult
  const mappedResult = await extensionCipherMap(plainCipher, (value) =>
    extensionEncStringEncrypt(value, cipherKeyResult.data),
  )
  if (!mappedResult.success) return mappedResult
  const encryptedResult = v.safeParse(bitwardenEncryptedCipherSchema, mappedResult.data)
  if (!encryptedResult.success) {
    return resultErrorCreate(op, "Encrypted extension cipher is invalid.", {
      code: "platform.internal",
      statusCode: 500,
      errorData: v.summarize(encryptedResult.issues),
    })
  }
  return resultCreate(encryptedResult.output)
}
