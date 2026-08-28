import { createPrivateKey, type KeyObject } from "node:crypto"
import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

export function rsaPrivateKeyLoad(privateKeyPem: string): Result<KeyObject> {
  const op = "rsaPrivateKeyLoad"

  try {
    const privateKey = createPrivateKey(privateKeyPem)
    if (privateKey.asymmetricKeyType !== "rsa") return resultErrorCreate(op, "RSA private key is required.")
    return resultCreate(privateKey)
  } catch {
    return resultErrorCreate(op, "Invalid RSA private key.")
  }
}
