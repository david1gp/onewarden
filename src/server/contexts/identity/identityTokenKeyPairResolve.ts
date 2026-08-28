import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { rsaKeyPairGenerate } from "../../../shared/crypto/rsaKeyPairGenerate.js"
import { rsaPrivateKeyLoad } from "../../../shared/crypto/rsaPrivateKeyLoad.js"
import { rsaPublicKeyLoad } from "../../../shared/crypto/rsaPublicKeyLoad.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { RsaKeyPair } from "../../../shared/crypto/rsaKeyPair.js"

type IdentitySigningKeyRow = {
  private_key_pem: string
  public_key_pem: string
}

export function identityTokenKeyPairResolve(database: DatabaseConnection | undefined): Result<RsaKeyPair> {
  const op = "identityTokenKeyPairResolve"
  const generatedResult = rsaKeyPairGenerate()
  if (!generatedResult.success) return generatedResult
  if (database === undefined) return generatedResult

  try {
    const saved = database
      .query<IdentitySigningKeyRow, []>(
        "SELECT private_key_pem, public_key_pem FROM identity_signing_keys WHERE id = 1",
      )
      .get()
    if (saved !== null) {
      const privateKeyResult = rsaPrivateKeyLoad(saved.private_key_pem)
      const publicKeyResult = rsaPublicKeyLoad(saved.public_key_pem)
      if (privateKeyResult.success && publicKeyResult.success) {
        return resultCreate({
          privateKey: privateKeyResult.data,
          publicKey: publicKeyResult.data,
          privateKeyPem: saved.private_key_pem,
          publicKeyPem: saved.public_key_pem,
        })
      }
    }
    database.run(
      "INSERT INTO identity_signing_keys (id, private_key_pem, public_key_pem) VALUES (1, ?, ?) ON CONFLICT(id) DO NOTHING",
      [generatedResult.data.privateKeyPem, generatedResult.data.publicKeyPem],
    )
    const persisted = database
      .query<IdentitySigningKeyRow, []>(
        "SELECT private_key_pem, public_key_pem FROM identity_signing_keys WHERE id = 1",
      )
      .get()
    if (persisted === null) return resultErrorCreate(op, "Registration verification key persistence failed.")
    const privateKeyResult = rsaPrivateKeyLoad(persisted.private_key_pem)
    if (!privateKeyResult.success) return resultErrorCreate(op, "Registration verification key loading failed.")
    const publicKeyResult = rsaPublicKeyLoad(persisted.public_key_pem)
    if (!publicKeyResult.success) return resultErrorCreate(op, "Registration verification key loading failed.")
    return resultCreate({
      privateKey: privateKeyResult.data,
      publicKey: publicKeyResult.data,
      privateKeyPem: persisted.private_key_pem,
      publicKeyPem: persisted.public_key_pem,
    })
  } catch {
    return resultErrorCreate(op, "Registration verification key persistence failed.")
  }
}
