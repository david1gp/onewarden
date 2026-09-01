import * as v from "valibot"
import type { Result } from "#result"
import {
  type BitwardenEncryptedCipher,
  bitwardenEncryptedCipherSchema,
} from "../../shared/api/bitwardenEncryptedCipherSchema.js"
import { bitwardenEncryptedLoginCipherSchema } from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionCipherKeyResolve } from "./extensionCipherKeyResolve.js"
import { extensionCipherMap } from "./extensionCipherMap.js"
import { type ExtensionCipher, extensionCipherSchema } from "./extensionCipherSchema.js"
import { extensionEncStringDecryptText } from "./extensionEncStringDecryptText.js"
import { extensionPersonalLoginCipherDecrypt } from "./extensionPersonalLoginCipherDecrypt.js"

export async function extensionCipherDecrypt(
  cipher: BitwardenEncryptedCipher,
  userKey: Uint8Array,
  organizationKeys: ReadonlyMap<string, Uint8Array> = new Map(),
): Promise<Result<ExtensionCipher>> {
  const op = "extensionCipherDecrypt"
  const parsed = v.safeParse(bitwardenEncryptedCipherSchema, cipher)
  if (!parsed.success) {
    return resultErrorCreate(op, "Encrypted extension cipher is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const encryptedCipher = parsed.output
  if (encryptedCipher.type === 1) {
    const loginParsed = v.safeParse(bitwardenEncryptedLoginCipherSchema, encryptedCipher)
    if (!loginParsed.success) return resultErrorCreate(op, "Encrypted login cipher is invalid.")
    const loginResult = await extensionPersonalLoginCipherDecrypt(
      encryptedCipher as Parameters<typeof extensionPersonalLoginCipherDecrypt>[0],
      userKey,
      organizationKeys,
    )
    if (!loginResult.success) return loginResult
    return resultCreate(loginResult.data)
  }

  const cipherKeyResult = await extensionCipherKeyResolve(encryptedCipher, userKey, organizationKeys)
  if (!cipherKeyResult.success) return cipherKeyResult
  const cipherForMapping = encryptedCipher.viewPassword === false ? { ...encryptedCipher } : encryptedCipher
  const mappedResult = await extensionCipherMap(cipherForMapping, (value) =>
    extensionEncStringDecryptText(value, cipherKeyResult.data),
  )
  if (!mappedResult.success) return mappedResult
  const decryptedResult = v.safeParse(extensionCipherSchema, mappedResult.data)
  if (!decryptedResult.success) {
    return resultErrorCreate(op, "Decrypted extension cipher is invalid.", {
      code: "platform.internal",
      statusCode: 500,
      errorData: v.summarize(decryptedResult.issues),
    })
  }
  return resultCreate(decryptedResult.output)
}
