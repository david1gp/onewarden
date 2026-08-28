import { createPublicKey, type KeyObject } from "node:crypto"
import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

export function rsaPublicKeyDerive(privateKey: KeyObject): Result<KeyObject> {
  const op = "rsaPublicKeyDerive"

  try {
    if (privateKey.asymmetricKeyType !== "rsa" || privateKey.type !== "private") {
      return resultErrorCreate(op, "RSA private key is required.")
    }
    return resultCreate(createPublicKey(privateKey))
  } catch {
    return resultErrorCreate(op, "RSA public key derivation failed.")
  }
}
