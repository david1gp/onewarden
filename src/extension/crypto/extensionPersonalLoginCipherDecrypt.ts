import * as v from "valibot"
import { type Result } from "#result"
import {
  type BitwardenEncryptedLoginCipher,
  bitwardenEncryptedLoginCipherSchema,
} from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionCipherKeyResolve } from "./extensionCipherKeyResolve.js"
import { extensionEncStringDecryptText } from "./extensionEncStringDecryptText.js"
import { extensionFido2CredentialDecrypt } from "./extensionFido2CredentialDecrypt.js"
import { extensionPersonalLoginCipherMap } from "./extensionPersonalLoginCipherMap.js"
import type { ExtensionPersonalLoginCipher } from "./extensionPersonalLoginCipherSchema.js"
import { extensionPersonalLoginCipherSchema } from "./extensionPersonalLoginCipherSchema.js"

export async function extensionPersonalLoginCipherDecrypt(
  cipher: BitwardenEncryptedLoginCipher,
  userKey: Uint8Array,
  organizationKeys: ReadonlyMap<string, Uint8Array> = new Map(),
): Promise<Result<ExtensionPersonalLoginCipher>> {
  const op = "extensionPersonalLoginCipherDecrypt"
  const parsed = v.safeParse(bitwardenEncryptedLoginCipherSchema, cipher)
  if (!parsed.success) {
    return resultErrorCreate(op, "Encrypted personal login cipher is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const encryptedCipher = parsed.output
  const cipherKeyResult = await extensionCipherKeyResolve(encryptedCipher, userKey, organizationKeys)
  if (!cipherKeyResult.success) return cipherKeyResult
  const cipherForMapping =
    encryptedCipher.viewPassword === false
      ? { ...encryptedCipher, login: { ...encryptedCipher.login, password: null, totp: null } }
      : encryptedCipher

  const decryptedResult = await extensionPersonalLoginCipherMap(cipherForMapping, (value) =>
    extensionEncStringDecryptText(value, cipherKeyResult.data),
  )
  if (!decryptedResult.success) return decryptedResult
  const fido2Credentials = []
  for (const credential of encryptedCipher.login.fido2Credentials ?? []) {
    const credentialResult = await extensionFido2CredentialDecrypt(credential, cipherKeyResult.data)
    if (!credentialResult.success) return credentialResult
    fido2Credentials.push(credentialResult.data)
  }
  const outputResult = v.safeParse(extensionPersonalLoginCipherSchema, {
    ...decryptedResult.data,
    login: {
      ...decryptedResult.data.login,
      ...(encryptedCipher.login.fido2Credentials === undefined
        ? {}
        : { fido2Credentials: encryptedCipher.login.fido2Credentials === null ? null : fido2Credentials }),
    },
  })
  if (!outputResult.success) {
    return resultErrorCreate(op, "Decrypted personal login cipher is invalid.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  return resultCreate(outputResult.output)
}
