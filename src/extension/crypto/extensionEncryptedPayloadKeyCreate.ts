import { type Result } from "#result"
import { sha256Digest } from "../../shared/crypto/sha256Digest.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

export async function extensionEncryptedPayloadKeyCreate(userKey: unknown): Promise<Result<CryptoKey>> {
  const op = "extensionEncryptedPayloadKeyCreate"
  if (!(userKey instanceof Uint8Array) || userKey.byteLength !== 64) {
    return resultErrorCreate(op, "Bitwarden user key must be 64 bytes.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const digestResult = await sha256Digest(userKey)
  if (!digestResult.success) return digestResult
  const keyMaterial = new Uint8Array(new ArrayBuffer(digestResult.data.byteLength))
  keyMaterial.set(digestResult.data)

  try {
    const key = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["decrypt", "encrypt"])
    keyMaterial.fill(0)
    return resultCreate(key)
  } catch {
    keyMaterial.fill(0)
    return resultErrorCreate(op, "Encrypted payload key creation failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
