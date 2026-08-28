import { generateKeyPairSync } from "node:crypto"
import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import type { RsaKeyPair } from "./rsaKeyPair.js"

export function rsaKeyPairGenerate(): Result<RsaKeyPair> {
  const op = "rsaKeyPairGenerate"

  try {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
    if (privateKey.asymmetricKeyType !== "rsa" || publicKey.asymmetricKeyType !== "rsa") {
      return resultErrorCreate(op, "Generated key pair is not RSA.")
    }
    const privateKeyPem = privateKey.export({ type: "pkcs1", format: "pem" }).toString()
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString()
    return resultCreate({ privateKey, publicKey, privateKeyPem, publicKeyPem })
  } catch {
    return resultErrorCreate(op, "RSA key pair generation failed.")
  }
}
