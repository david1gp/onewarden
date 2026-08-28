import * as v from "valibot"
import { type Result } from "#result"
import { base64Decode } from "../../shared/crypto/base64Decode.js"
import {
  type ExtensionEncryptedPayload,
  extensionEncryptedPayloadSchema,
} from "../storage/extensionEncryptedPayloadSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncryptedPayloadKeyCreate } from "./extensionEncryptedPayloadKeyCreate.js"

export async function extensionEncryptedPayloadDecrypt(
  payload: unknown,
  userKey: unknown,
): Promise<Result<Uint8Array>> {
  const op = "extensionEncryptedPayloadDecrypt"
  const parsed = v.safeParse(extensionEncryptedPayloadSchema, payload)
  if (!parsed.success) {
    return resultErrorCreate(op, "Encrypted payload is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
      errorData: v.summarize(parsed.issues),
    })
  }
  const encryptedPayload: ExtensionEncryptedPayload = parsed.output
  if (encryptedPayload.algorithm !== "AES-GCM") {
    return resultErrorCreate(op, "Encrypted payload algorithm is unsupported.", {
      code: "extension.unsupported",
      statusCode: 400,
    })
  }
  const ivResult = base64Decode(encryptedPayload.iv)
  if (!ivResult.success || ivResult.data.byteLength !== 12) {
    return resultErrorCreate(op, "Encrypted payload IV is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const ciphertextResult = base64Decode(encryptedPayload.ciphertext)
  if (!ciphertextResult.success || ciphertextResult.data.byteLength === 0) {
    return resultErrorCreate(op, "Encrypted payload ciphertext is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const keyResult = await extensionEncryptedPayloadKeyCreate(userKey)
  if (!keyResult.success) return keyResult
  const iv = new Uint8Array(new ArrayBuffer(ivResult.data.byteLength))
  iv.set(ivResult.data)
  const ciphertext = new Uint8Array(new ArrayBuffer(ciphertextResult.data.byteLength))
  ciphertext.set(ciphertextResult.data)

  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyResult.data, ciphertext)
    return resultCreate(new Uint8Array(plaintext))
  } catch {
    return resultErrorCreate(op, "Encrypted payload could not be decrypted.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
