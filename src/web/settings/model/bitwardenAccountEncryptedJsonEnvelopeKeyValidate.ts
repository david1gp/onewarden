import * as v from "valibot"
import type { Result } from "#result"
import { bitwardenCipherStringDecrypt } from "../../../shared/crypto/bitwardenCipherStringDecrypt.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import {
  bitwardenAccountEncryptedJsonEnvelopeSchema,
  type BitwardenAccountEncryptedJsonEnvelope,
} from "./bitwardenAccountEncryptedJsonEnvelopeSchema.js"

const GUID_MARKER_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i

function invalidEnvelopeResult<T>(message: string): Result<T> {
  return resultErrorCreate("bitwardenAccountEncryptedJsonEnvelopeKeyValidate", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

function authenticationResult<T>(): Result<T> {
  return resultErrorCreate(
    "bitwardenAccountEncryptedJsonEnvelopeKeyValidate",
    "Account-encrypted Bitwarden export key validation failed.",
    { code: "platform.unauthorized", statusCode: 401 },
  )
}

export async function bitwardenAccountEncryptedJsonEnvelopeKeyValidate(
  rawEnvelope: unknown,
  userKey: Uint8Array,
): Promise<Result<void>> {
  const parsedEnvelope = v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, rawEnvelope)
  if (!parsedEnvelope.success) {
    return invalidEnvelopeResult(
      `Invalid account-encrypted Bitwarden JSON envelope: ${v.summarize(parsedEnvelope.issues)}`,
    )
  }
  if (!(userKey instanceof Uint8Array) || userKey.byteLength !== 64) {
    return invalidEnvelopeResult("Bitwarden account user key must be 64 bytes.")
  }

  const envelope: BitwardenAccountEncryptedJsonEnvelope = parsedEnvelope.output
  const markerResult = await bitwardenCipherStringDecrypt(envelope.encKeyValidation_DO_NOT_EDIT, userKey)
  if (!markerResult.success) return authenticationResult()

  let marker: string
  try {
    marker = new TextDecoder("utf-8", { fatal: true }).decode(markerResult.data)
  } catch {
    return authenticationResult()
  } finally {
    markerResult.data.fill(0)
  }

  if (!GUID_MARKER_PATTERN.test(marker)) return authenticationResult()
  return resultCreate(undefined)
}
