import * as v from "valibot"
import { type Result } from "#result"
import { base64UrlDecode } from "../crypto/base64UrlDecode.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { sessionHandoffAdditionalDataCreate } from "./sessionHandoffAdditionalDataCreate.js"
import {
  type SessionHandoffEncryptedUserKey,
  sessionHandoffEncryptedUserKeySchema,
} from "./sessionHandoffEncryptedUserKeySchema.js"
import type { SessionHandoffOperation } from "./sessionHandoffOperationSchema.js"

export async function sessionHandoffUserKeyDecrypt(
  encryptedUserKey: SessionHandoffEncryptedUserKey,
  transferKey: Uint8Array,
  operation: SessionHandoffOperation,
  cipherId: string | null,
): Promise<Result<Uint8Array>> {
  const op = "sessionHandoffUserKeyDecrypt"
  const parsed = v.safeParse(sessionHandoffEncryptedUserKeySchema, encryptedUserKey)
  if (!parsed.success || transferKey.byteLength !== 32) {
    return resultErrorCreate(op, "User key transfer is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const ivResult = base64UrlDecode(parsed.output.iv)
  const ciphertextResult = base64UrlDecode(parsed.output.ciphertext)
  if (!ivResult.success || ivResult.data.byteLength !== 12 || !ciphertextResult.success) {
    return resultErrorCreate(op, "User key transfer is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const keyBytes = new Uint8Array(new ArrayBuffer(transferKey.byteLength))
  keyBytes.set(transferKey)
  const iv = new Uint8Array(new ArrayBuffer(ivResult.data.byteLength))
  iv.set(ivResult.data)
  const ciphertext = new Uint8Array(new ArrayBuffer(ciphertextResult.data.byteLength))
  ciphertext.set(ciphertextResult.data)
  const additionalData = sessionHandoffAdditionalDataCreate(operation, cipherId)
  try {
    const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"])
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData,
        tagLength: 128,
      },
      cryptoKey,
      ciphertext,
    )
    const userKey = new Uint8Array(plaintext)
    if (userKey.byteLength === 64) return resultCreate(userKey)
    userKey.fill(0)
    return resultErrorCreate(op, "Transferred user key is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  } catch {
    return resultErrorCreate(op, "User key transfer could not be decrypted.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
}
