import type { Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { aesCbcDecrypt } from "./aesCbcDecrypt.js"
import { hmacSha256Digest } from "./hmacSha256Digest.js"

const ATTACHMENT_KEY_LENGTH = 64
const ATTACHMENT_ENCRYPTION_TYPE = 2
const ATTACHMENT_IV_LENGTH = 16
const ATTACHMENT_MAC_LENGTH = 32
const ATTACHMENT_HEADER_LENGTH = 1 + ATTACHMENT_IV_LENGTH + ATTACHMENT_MAC_LENGTH

function bytesConcat(left: Uint8Array, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.byteLength + right.byteLength)
  result.set(left)
  result.set(right, left.byteLength)
  return result
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.byteLength, right.byteLength)
  let difference = left.byteLength ^ right.byteLength
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return difference === 0
}

export async function bitwardenAttachmentBinaryDecrypt(
  encryptedData: Uint8Array,
  attachmentKey: Uint8Array,
): Promise<Result<Uint8Array>> {
  const op = "bitwardenAttachmentBinaryDecrypt"
  if (!(attachmentKey instanceof Uint8Array) || attachmentKey.byteLength !== ATTACHMENT_KEY_LENGTH) {
    return resultErrorCreate(op, "Bitwarden attachment key must be 64 bytes.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (!(encryptedData instanceof Uint8Array) || encryptedData.byteLength < ATTACHMENT_HEADER_LENGTH) {
    return resultErrorCreate(op, "Bitwarden attachment ciphertext is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const encryptedBytes = new Uint8Array(encryptedData)
  let authenticationInput: Uint8Array | undefined
  let expectedMac: Uint8Array | undefined
  let plaintext: Uint8Array | undefined
  let plaintextReturned = false
  try {
    if (encryptedBytes[0] !== ATTACHMENT_ENCRYPTION_TYPE) {
      return resultErrorCreate(op, "Only Bitwarden attachment AES-CBC-HMAC encryption is supported.", {
        code: "extension.unsupported",
        statusCode: 400,
      })
    }

    const ciphertextLength = encryptedBytes.byteLength - ATTACHMENT_HEADER_LENGTH
    if (ciphertextLength === 0 || ciphertextLength % ATTACHMENT_IV_LENGTH !== 0) {
      return resultErrorCreate(op, "Bitwarden attachment ciphertext has an invalid length.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    const iv = encryptedBytes.subarray(1, 1 + ATTACHMENT_IV_LENGTH)
    const mac = encryptedBytes.subarray(1 + ATTACHMENT_IV_LENGTH, ATTACHMENT_HEADER_LENGTH)
    const ciphertext = encryptedBytes.subarray(ATTACHMENT_HEADER_LENGTH)
    authenticationInput = bytesConcat(iv, ciphertext)

    const authenticationKey = attachmentKey.slice(32)
    let macResult: Result<Uint8Array>
    try {
      macResult = await hmacSha256Digest(authenticationKey, authenticationInput)
    } finally {
      authenticationKey.fill(0)
    }
    if (!macResult.success) return macResult
    expectedMac = macResult.data
    if (!constantTimeEqual(mac, expectedMac)) {
      return resultErrorCreate(op, "Bitwarden attachment authentication failed.", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    }

    const encryptionKey = attachmentKey.slice(0, 32)
    let plaintextResult: Result<Uint8Array>
    try {
      plaintextResult = await aesCbcDecrypt(ciphertext, encryptionKey, iv)
    } finally {
      encryptionKey.fill(0)
    }
    if (!plaintextResult.success) return plaintextResult
    plaintext = plaintextResult.data
    const plaintextResultOk = resultCreate(plaintext)
    plaintextReturned = true
    return plaintextResultOk
  } finally {
    encryptedBytes.fill(0)
    authenticationInput?.fill(0)
    expectedMac?.fill(0)
    if (!plaintextReturned) plaintext?.fill(0)
  }
}
