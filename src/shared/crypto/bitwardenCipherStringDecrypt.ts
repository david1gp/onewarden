import type { Result } from "#result"
import { aesCbcDecrypt } from "./aesCbcDecrypt.js"
import { base64Decode } from "./base64Decode.js"
import { hmacSha256Digest } from "./hmacSha256Digest.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

const USER_KEY_LENGTH = 64
const AES_IV_LENGTH = 16
const MAC_LENGTH = 32

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

function invalidCipherResult(message: string): Result<Uint8Array> {
  return resultErrorCreate("bitwardenCipherStringDecrypt", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

export async function bitwardenCipherStringDecrypt(
  encryptedString: string,
  userKey: Uint8Array,
): Promise<Result<Uint8Array>> {
  const op = "bitwardenCipherStringDecrypt"
  if (userKey.byteLength !== USER_KEY_LENGTH) return resultErrorCreate(op, "Bitwarden user key must be 64 bytes.")

  const headerParts = encryptedString.split(".")
  if (headerParts.length !== 2) return invalidCipherResult("Bitwarden cipher string is invalid.")
  const [encryptionType, encodedParts] = headerParts
  if (encryptionType !== "2") {
    return resultErrorCreate(op, "Only Bitwarden AES-CBC-HMAC cipher strings are supported.", {
      code: "extension.unsupported",
      statusCode: 400,
    })
  }
  if (encodedParts === undefined) return invalidCipherResult("Bitwarden cipher string is invalid.")
  const parts = encodedParts.split("|")
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return invalidCipherResult("Bitwarden cipher string is invalid.")
  }
  const [ivString, ciphertextString, macString] = parts
  if (ivString === undefined || ciphertextString === undefined || macString === undefined) {
    return invalidCipherResult("Bitwarden cipher string is invalid.")
  }
  const ivResult = base64Decode(ivString)
  const ciphertextResult = base64Decode(ciphertextString)
  const macResult = base64Decode(macString)
  let authenticationInput: Uint8Array | undefined
  let expectedMac: Uint8Array | undefined
  try {
    if (!ivResult.success || !ciphertextResult.success || !macResult.success) {
      return invalidCipherResult("Bitwarden cipher string contains invalid Base64.")
    }
    if (ivResult.data.byteLength !== AES_IV_LENGTH || macResult.data.byteLength !== MAC_LENGTH) {
      return invalidCipherResult("Bitwarden cipher string has invalid authentication parts.")
    }

    authenticationInput = bytesConcat(ivResult.data, ciphertextResult.data)
    const authenticationKey = userKey.slice(32)
    let expectedMacResult: Result<Uint8Array>
    try {
      expectedMacResult = await hmacSha256Digest(authenticationKey, authenticationInput)
    } finally {
      authenticationKey.fill(0)
    }
    if (!expectedMacResult.success) return expectedMacResult
    expectedMac = expectedMacResult.data
    if (!constantTimeEqual(macResult.data, expectedMac)) {
      return resultErrorCreate(op, "Bitwarden cipher string authentication failed.", {
        code: "platform.unauthorized",
        statusCode: 401,
      })
    }

    const decryptionKey = userKey.slice(0, 32)
    let plaintextResult: Result<Uint8Array>
    try {
      plaintextResult = await aesCbcDecrypt(ciphertextResult.data, decryptionKey, ivResult.data)
    } finally {
      decryptionKey.fill(0)
    }
    if (!plaintextResult.success) return plaintextResult
    return resultCreate(plaintextResult.data)
  } finally {
    if (ivResult.success) ivResult.data.fill(0)
    if (ciphertextResult.success) ciphertextResult.data.fill(0)
    if (macResult.success) macResult.data.fill(0)
    authenticationInput?.fill(0)
    expectedMac?.fill(0)
  }
}
