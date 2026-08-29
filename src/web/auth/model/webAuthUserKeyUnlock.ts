import { type Result } from "#result"
import { bitwardenCipherStringDecrypt } from "../../../shared/crypto/bitwardenCipherStringDecrypt.js"
import { hkdfSha256Expand } from "../../../shared/crypto/hkdfSha256Expand.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type WebAuthKdfMetadata, webAuthMasterKeyDerive } from "./webAuthMasterKeyDerive.js"

const USER_KEY_BYTE_LENGTH = 64

export async function webAuthUserKeyUnlock(
  masterPassword: string,
  email: string,
  kdfMetadata: WebAuthKdfMetadata,
  encryptedUserKey: string,
): Promise<Result<Uint8Array>> {
  const op = "webAuthUserKeyUnlock"
  const masterKeyResult = await webAuthMasterKeyDerive(masterPassword, email, kdfMetadata)
  if (!masterKeyResult.success) return masterKeyResult
  const masterKey = masterKeyResult.data

  const encryptionKeyResult = await hkdfSha256Expand(masterKey, new TextEncoder().encode("enc"), 32)
  if (!encryptionKeyResult.success) {
    masterKey.fill(0)
    return resultErrorCreate(op, "Master key stretching failed.", { code: "platform.internal", statusCode: 500 })
  }
  const authenticationKeyResult = await hkdfSha256Expand(masterKey, new TextEncoder().encode("mac"), 32)
  if (!authenticationKeyResult.success) {
    masterKey.fill(0)
    encryptionKeyResult.data.fill(0)
    return resultErrorCreate(op, "Master key stretching failed.", { code: "platform.internal", statusCode: 500 })
  }

  const stretchedMasterKey = new Uint8Array(64)
  stretchedMasterKey.set(encryptionKeyResult.data)
  stretchedMasterKey.set(authenticationKeyResult.data, 32)
  masterKey.fill(0)
  encryptionKeyResult.data.fill(0)
  authenticationKeyResult.data.fill(0)

  const decryptedKeyResult = await bitwardenCipherStringDecrypt(encryptedUserKey, stretchedMasterKey)
  stretchedMasterKey.fill(0)
  if (!decryptedKeyResult.success) return decryptedKeyResult

  if (decryptedKeyResult.data.byteLength !== USER_KEY_BYTE_LENGTH) {
    decryptedKeyResult.data.fill(0)
    return resultErrorCreate(op, "Decrypted user key has invalid length.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  return resultCreate(decryptedKeyResult.data)
}
