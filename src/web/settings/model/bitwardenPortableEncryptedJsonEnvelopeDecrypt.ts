import * as v from "valibot"
import { type Result } from "#result"
import { bitwardenCipherStringDecryptText } from "../../../shared/crypto/bitwardenCipherStringDecryptText.js"
import { bitwardenPortableEncryptionKeyDerive } from "../../../shared/crypto/bitwardenPortableEncryptionKeyDerive.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { BitwardenJsonPayload } from "./bitwardenJsonPayloadSchema.js"
import { bitwardenJsonPayloadSchema } from "./bitwardenJsonPayloadSchema.js"
import { bitwardenPortableEncryptedJsonEnvelopeSchema } from "./bitwardenPortableEncryptedJsonEnvelopeSchema.js"

function invalidEnvelopeResult<T>(message: string): Result<T> {
  return resultErrorCreate("bitwardenPortableEncryptedJsonEnvelopeDecrypt", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

function authenticationResult<T>(): Result<T> {
  return resultErrorCreate(
    "bitwardenPortableEncryptedJsonEnvelopeDecrypt",
    "Portable Bitwarden export password or integrity check failed.",
    { code: "platform.unauthorized", statusCode: 401 },
  )
}

export async function bitwardenPortableEncryptedJsonEnvelopeDecrypt(
  rawEnvelope: unknown,
  password: string,
): Promise<Result<BitwardenJsonPayload>> {
  const parsedEnvelope = v.safeParse(bitwardenPortableEncryptedJsonEnvelopeSchema, rawEnvelope)
  if (!parsedEnvelope.success) {
    return invalidEnvelopeResult(
      `Invalid password-protected Bitwarden JSON envelope: ${v.summarize(parsedEnvelope.issues)}`,
    )
  }
  if (typeof password !== "string" || password.length === 0) {
    return invalidEnvelopeResult("Portable Bitwarden export password is required.")
  }

  const envelope = parsedEnvelope.output
  const keyResult = await bitwardenPortableEncryptionKeyDerive(password, envelope.salt, {
    kdfType: envelope.kdfType,
    iterations: envelope.kdfIterations,
    memory: envelope.kdfMemory,
    parallelism: envelope.kdfParallelism,
  })
  if (!keyResult.success) return keyResult

  const validationResult = await bitwardenCipherStringDecryptText(envelope.encKeyValidation_DO_NOT_EDIT, keyResult.data)
  if (!validationResult.success) {
    keyResult.data.fill(0)
    return authenticationResult()
  }

  const dataResult = await bitwardenCipherStringDecryptText(envelope.data, keyResult.data)
  keyResult.data.fill(0)
  if (!dataResult.success) return authenticationResult()

  let rawPayload: unknown
  try {
    rawPayload = JSON.parse(dataResult.data)
  } catch {
    return invalidEnvelopeResult("Portable Bitwarden export data is not valid JSON.")
  }

  const payloadResult = v.safeParse(bitwardenJsonPayloadSchema, rawPayload)
  if (!payloadResult.success) {
    return invalidEnvelopeResult(
      `Portable Bitwarden export data is not a valid decrypted JSON export: ${v.summarize(payloadResult.issues)}`,
    )
  }
  return resultCreate(payloadResult.output)
}
