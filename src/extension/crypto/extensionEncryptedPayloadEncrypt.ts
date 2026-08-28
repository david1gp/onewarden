import { type Result } from "#result"
import { base64Encode } from "../../shared/crypto/base64Encode.js"
import { secureRandomBytes } from "../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { ExtensionEncryptedPayload } from "../storage/extensionEncryptedPayloadSchema.js"
import { extensionEncryptedPayloadKeyCreate } from "./extensionEncryptedPayloadKeyCreate.js"

export async function extensionEncryptedPayloadEncrypt(
  plaintext: unknown,
  userKey: unknown,
): Promise<Result<ExtensionEncryptedPayload>> {
  const op = "extensionEncryptedPayloadEncrypt"
  if (typeof plaintext !== "string" && !(plaintext instanceof Uint8Array)) {
    return resultErrorCreate(op, "Encrypted payload plaintext is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const keyResult = await extensionEncryptedPayloadKeyCreate(userKey)
  if (!keyResult.success) return keyResult
  const ivResult = secureRandomBytes(12)
  if (!ivResult.success) return ivResult
  const iv = new Uint8Array(new ArrayBuffer(ivResult.data.byteLength))
  iv.set(ivResult.data)
  const bytes = typeof plaintext === "string" ? new TextEncoder().encode(plaintext) : new Uint8Array(plaintext)
  const plaintextBytes = new Uint8Array(new ArrayBuffer(bytes.byteLength))
  plaintextBytes.set(bytes)

  try {
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, keyResult.data, plaintextBytes)
    return resultCreate({
      algorithm: "AES-GCM",
      iv: base64Encode(iv),
      ciphertext: base64Encode(new Uint8Array(ciphertext)),
    })
  } catch {
    return resultErrorCreate(op, "Encrypted payload encryption failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
