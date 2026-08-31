import * as v from "valibot"
import { type Result } from "#result"
import {
  type BitwardenEncryptedLoginCipher,
  bitwardenEncryptedLoginCipherSchema,
} from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringEncrypt } from "./extensionEncStringEncrypt.js"
import { extensionFido2CredentialEncrypt } from "./extensionFido2CredentialEncrypt.js"
import { extensionPersonalLoginCipherMap } from "./extensionPersonalLoginCipherMap.js"
import {
  type ExtensionPersonalLoginCipher,
  extensionPersonalLoginCipherSchema,
} from "./extensionPersonalLoginCipherSchema.js"

function unsupportedResult(message: string): Result<BitwardenEncryptedLoginCipher> {
  return resultErrorCreate("extensionPersonalLoginCipherEncrypt", message, {
    code: "extension.unsupported",
    statusCode: 400,
  })
}

export async function extensionPersonalLoginCipherEncrypt(
  cipher: ExtensionPersonalLoginCipher,
  userKey: Uint8Array,
): Promise<Result<BitwardenEncryptedLoginCipher>> {
  const op = "extensionPersonalLoginCipherEncrypt"
  const parsed = v.safeParse(extensionPersonalLoginCipherSchema, cipher)
  if (!parsed.success) {
    return resultErrorCreate(op, "Personal login cipher is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const plainCipher = parsed.output
  if (plainCipher.organizationId !== undefined && plainCipher.organizationId !== null) {
    return unsupportedResult("Organization ciphers are not supported.")
  }
  if (plainCipher.key !== undefined && plainCipher.key !== null) {
    return unsupportedResult("Cipher-specific keys are not supported.")
  }
  const encryptedResult = await extensionPersonalLoginCipherMap(plainCipher, (value) =>
    extensionEncStringEncrypt(value, userKey),
  )
  if (!encryptedResult.success) return encryptedResult
  const fido2Credentials = []
  for (const credential of plainCipher.login.fido2Credentials ?? []) {
    const credentialResult = await extensionFido2CredentialEncrypt(credential, userKey)
    if (!credentialResult.success) return credentialResult
    fido2Credentials.push(credentialResult.data)
  }
  const outputResult = v.safeParse(bitwardenEncryptedLoginCipherSchema, {
    ...encryptedResult.data,
    login: {
      ...encryptedResult.data.login,
      ...(plainCipher.login.fido2Credentials === undefined
        ? {}
        : { fido2Credentials: plainCipher.login.fido2Credentials === null ? null : fido2Credentials }),
    },
  })
  if (!outputResult.success) {
    return resultErrorCreate(op, "Encrypted personal login cipher is invalid.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  return resultCreate(outputResult.output)
}
