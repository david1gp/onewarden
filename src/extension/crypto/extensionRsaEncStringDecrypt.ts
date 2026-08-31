import { type Result } from "#result"
import { base64Decode } from "../../shared/crypto/base64Decode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

type RsaHash = "SHA-1" | "SHA-256"

function rsaCiphertextRead(encryptedString: unknown, hash: RsaHash): Result<Uint8Array> {
  const op = "extensionRsaEncStringDecrypt"
  if (typeof encryptedString !== "string") {
    return resultErrorCreate(op, "RSA EncString is invalid.", { code: "platform.invalid-request", statusCode: 400 })
  }

  const [type, encodedParts] = encryptedString.split(".")
  const expectedType = hash === "SHA-1" ? "4" : "3"
  if (type !== expectedType || encodedParts === undefined || encodedParts.includes("|")) {
    return resultErrorCreate(op, "RSA EncString encryption type is unsupported.", {
      code: "extension.unsupported",
      statusCode: 400,
    })
  }

  const ciphertextResult = base64Decode(encodedParts)
  if (!ciphertextResult.success) {
    return resultErrorCreate(op, "RSA EncString contains invalid Base64.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return ciphertextResult
}

export async function extensionRsaEncStringDecrypt(
  encryptedString: unknown,
  privateKeyBytes: Uint8Array,
): Promise<Result<Uint8Array>> {
  const op = "extensionRsaEncStringDecrypt"
  if (!(privateKeyBytes instanceof Uint8Array) || privateKeyBytes.byteLength === 0) {
    return resultErrorCreate(op, "RSA private key is invalid.", { code: "platform.invalid-request", statusCode: 400 })
  }

  if (typeof encryptedString !== "string") {
    return resultErrorCreate(op, "RSA EncString is invalid.", { code: "platform.invalid-request", statusCode: 400 })
  }
  const type = encryptedString.split(".")[0]
  const hash: RsaHash = type === "3" ? "SHA-256" : type === "4" ? "SHA-1" : "SHA-1"
  const ciphertextResult = rsaCiphertextRead(encryptedString, hash)
  if (!ciphertextResult.success) return ciphertextResult

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      new Uint8Array(privateKeyBytes),
      { name: "RSA-OAEP", hash },
      false,
      ["decrypt"],
    )
    const plaintext = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      cryptoKey,
      new Uint8Array(ciphertextResult.data),
    )
    return resultCreate(new Uint8Array(plaintext))
  } catch {
    return resultErrorCreate(op, "RSA EncString decryption failed.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
}
