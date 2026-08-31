import { type Result } from "#result"
import { base64Encode } from "../../../shared/crypto/base64Encode.js"
import { bitwardenCipherStringEncrypt } from "../../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { bitwardenPortableEncryptionKeyDerive } from "../../../shared/crypto/bitwardenPortableEncryptionKeyDerive.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { BitwardenPortableEncryptedJsonEnvelope } from "./bitwardenPortableEncryptedJsonEnvelopeSchema.js"

const PBKDF2_KDF_TYPE = 0
const PBKDF2_ITERATIONS = 600_000
const PORTABLE_SALT_LENGTH = 16

export async function bitwardenPortableEncryptedJsonEnvelopeEncrypt(
  plaintext: string,
  password: string,
): Promise<Result<BitwardenPortableEncryptedJsonEnvelope>> {
  const op = "bitwardenPortableEncryptedJsonEnvelopeEncrypt"
  if (typeof password !== "string" || password.length === 0) {
    return resultErrorCreate(op, "Portable export password cannot be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const saltResult = secureRandomBytes(PORTABLE_SALT_LENGTH)
  if (!saltResult.success) return saltResult
  const salt = base64Encode(saltResult.data)
  const keyResult = await bitwardenPortableEncryptionKeyDerive(password, salt, {
    kdfType: PBKDF2_KDF_TYPE,
    iterations: PBKDF2_ITERATIONS,
  })
  saltResult.data.fill(0)
  if (!keyResult.success) return keyResult

  const validationBytesResult = secureRandomBytes(16)
  if (!validationBytesResult.success) {
    keyResult.data.fill(0)
    return validationBytesResult
  }
  const validationValue = base64Encode(validationBytesResult.data)
  validationBytesResult.data.fill(0)

  const validationResult = await bitwardenCipherStringEncrypt(validationValue, keyResult.data)
  if (!validationResult.success) {
    keyResult.data.fill(0)
    return validationResult
  }
  const dataResult = await bitwardenCipherStringEncrypt(plaintext, keyResult.data)
  keyResult.data.fill(0)
  if (!dataResult.success) return dataResult

  return resultCreate({
    encrypted: true,
    passwordProtected: true,
    salt,
    kdfIterations: PBKDF2_ITERATIONS,
    kdfType: PBKDF2_KDF_TYPE,
    encKeyValidation_DO_NOT_EDIT: validationResult.data,
    data: dataResult.data,
  })
}
