import type { Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { aesCbcEncrypt } from "./aesCbcEncrypt.js"
import { hmacSha256Digest } from "./hmacSha256Digest.js"
import { secureRandomBytes } from "./secureRandomBytes.js"

const ATTACHMENT_KEY_LENGTH = 64
const ATTACHMENT_ENCRYPTION_TYPE = 2

export async function bitwardenAttachmentBinaryEncrypt(
  plaintext: Uint8Array,
  attachmentKey: Uint8Array,
): Promise<Result<Uint8Array>> {
  const op = "bitwardenAttachmentBinaryEncrypt"
  if (!(attachmentKey instanceof Uint8Array) || attachmentKey.byteLength !== ATTACHMENT_KEY_LENGTH) {
    return resultErrorCreate(op, "Bitwarden attachment key must be 64 bytes.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const ivResult = secureRandomBytes(16)
  if (!ivResult.success) return ivResult
  const iv = ivResult.data
  const encryptionKey = attachmentKey.slice(0, 32)
  const authenticationKey = attachmentKey.slice(32)
  let ciphertext: Uint8Array | undefined
  let mac: Uint8Array | undefined
  try {
    const ciphertextResult = await aesCbcEncrypt(plaintext, encryptionKey, iv)
    if (!ciphertextResult.success) return ciphertextResult
    ciphertext = ciphertextResult.data
    const authenticationInput = new Uint8Array(iv.byteLength + ciphertext.byteLength)
    authenticationInput.set(iv)
    authenticationInput.set(ciphertext, iv.byteLength)
    const macResult = await hmacSha256Digest(authenticationKey, authenticationInput)
    authenticationInput.fill(0)
    if (!macResult.success) return macResult
    mac = macResult.data
    const encrypted = new Uint8Array(1 + iv.byteLength + mac.byteLength + ciphertext.byteLength)
    encrypted[0] = ATTACHMENT_ENCRYPTION_TYPE
    encrypted.set(iv, 1)
    encrypted.set(mac, 1 + iv.byteLength)
    encrypted.set(ciphertext, 1 + iv.byteLength + mac.byteLength)
    return resultCreate(encrypted)
  } finally {
    iv.fill(0)
    encryptionKey.fill(0)
    authenticationKey.fill(0)
    ciphertext?.fill(0)
    mac?.fill(0)
  }
}
