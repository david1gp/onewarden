import { type Result } from "#result"
import { base64Encode } from "../../../shared/crypto/base64Encode.js"
import { bitwardenCipherStringEncrypt } from "../../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { hkdfSha256Expand } from "../../../shared/crypto/hkdfSha256Expand.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type WebAuthKdfMetadata, webAuthMasterKeyDerive } from "./webAuthMasterKeyDerive.js"

export interface GeneratedUserKeys {
  userKey: Uint8Array
  wrappedUserKey: string
  encryptedPrivateKey: string
  publicKey: string
}

export async function webAuthUserKeysGenerate(
  masterPassword: string,
  email: string,
  kdfMetadata: WebAuthKdfMetadata,
): Promise<Result<GeneratedUserKeys>> {
  const op = "webAuthUserKeysGenerate"
  const userKeyBytesResult = secureRandomBytes(64)
  if (!userKeyBytesResult.success) return userKeyBytesResult
  const userKey = userKeyBytesResult.data

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

  const wrappedUserKeyResult = await bitwardenCipherStringEncrypt(userKey, stretchedMasterKey)
  stretchedMasterKey.fill(0)
  if (!wrappedUserKeyResult.success) return wrappedUserKeyResult

  let keyPair: CryptoKeyPair
  try {
    keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-1",
      },
      true,
      ["encrypt", "decrypt"],
    )
  } catch {
    return resultErrorCreate(op, "RSA key generation failed.", { code: "platform.internal", statusCode: 500 })
  }

  let privateKeyBytes: Uint8Array
  let publicKeyBytes: Uint8Array
  try {
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)
    const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey)
    privateKeyBytes = new Uint8Array(pkcs8)
    publicKeyBytes = new Uint8Array(spki)
  } catch {
    return resultErrorCreate(op, "RSA key export failed.", { code: "platform.internal", statusCode: 500 })
  }

  const encryptedPrivateKeyResult = await bitwardenCipherStringEncrypt(privateKeyBytes, userKey)
  if (!encryptedPrivateKeyResult.success) return encryptedPrivateKeyResult

  return resultCreate({
    userKey,
    wrappedUserKey: wrappedUserKeyResult.data,
    encryptedPrivateKey: encryptedPrivateKeyResult.data,
    publicKey: base64Encode(publicKeyBytes),
  })
}
