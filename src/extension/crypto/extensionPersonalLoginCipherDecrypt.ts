import * as v from "valibot"
import { type Result } from "#result"
import {
  type BitwardenEncryptedLoginCipher,
  bitwardenEncryptedLoginCipherSchema,
} from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncStringDecryptText } from "./extensionEncStringDecryptText.js"
import { extensionPersonalLoginCipherMap } from "./extensionPersonalLoginCipherMap.js"
import {
  type ExtensionPersonalLoginCipher,
  extensionPersonalLoginCipherSchema,
} from "./extensionPersonalLoginCipherSchema.js"

function unsupportedResult(message: string): Result<ExtensionPersonalLoginCipher> {
  return resultErrorCreate("extensionPersonalLoginCipherDecrypt", message, {
    code: "extension.unsupported",
    statusCode: 400,
  })
}

export async function extensionPersonalLoginCipherDecrypt(
  cipher: BitwardenEncryptedLoginCipher,
  userKey: Uint8Array,
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
  if (encryptedCipher.organizationId !== undefined && encryptedCipher.organizationId !== null) {
    return unsupportedResult("Organization ciphers are not supported.")
  }
  if (Array.isArray(encryptedCipher.login.fido2Credentials) && encryptedCipher.login.fido2Credentials.length > 0) {
    return unsupportedResult("Passkey fields are not supported.")
  }
  if (encryptedCipher.key !== undefined && encryptedCipher.key !== null) {
    return unsupportedResult("Cipher-specific keys are not supported.")
  }
  if (encryptedCipher.login.totp !== null) return unsupportedResult("TOTP fields are not supported.")

  const decryptedResult = await extensionPersonalLoginCipherMap(encryptedCipher, (value) =>
    extensionEncStringDecryptText(value, userKey),
  )
  if (!decryptedResult.success) return decryptedResult
  const outputResult = v.safeParse(extensionPersonalLoginCipherSchema, decryptedResult.data)
  if (!outputResult.success) {
    return resultErrorCreate(op, "Decrypted personal login cipher is invalid.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  return resultCreate(outputResult.output)
}
