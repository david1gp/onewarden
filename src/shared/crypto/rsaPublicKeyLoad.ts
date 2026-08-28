import { createPublicKey, type KeyObject } from "node:crypto"
import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

export function rsaPublicKeyLoad(publicKeyPem: string): Result<KeyObject> {
  const op = "rsaPublicKeyLoad"

  try {
    const publicKey = createPublicKey(publicKeyPem)
    if (publicKey.asymmetricKeyType !== "rsa") return resultErrorCreate(op, "RSA public key is required.")
    return resultCreate(publicKey)
  } catch {
    return resultErrorCreate(op, "Invalid RSA public key.")
  }
}
