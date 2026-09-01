import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { rsaKeyPairGenerate } from "../../../shared/crypto/rsaKeyPairGenerate.js"
import { rsaPrivateKeyLoad } from "../../../shared/crypto/rsaPrivateKeyLoad.js"
import { rsaPublicKeyLoad } from "../../../shared/crypto/rsaPublicKeyLoad.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identitySigningKeys, type IdentitySigningKeyInsert } from "../../database/schema/identitySigningKeys.js"
import type { RsaKeyPair } from "../../../shared/crypto/rsaKeyPair.js"
import { eq } from "drizzle-orm"

export function identityTokenKeyPairResolve(database: DatabaseConnection | undefined): Result<RsaKeyPair> {
  const op = "identityTokenKeyPairResolve"
  const generatedResult = rsaKeyPairGenerate()
  if (!generatedResult.success) return generatedResult
  if (database === undefined) return generatedResult

  try {
    const saved = database.drizzle
      .select()
      .from(identitySigningKeys)
      .where(eq(identitySigningKeys.id, 1))
      .limit(1)
      .get()
    if (saved !== undefined) {
      const privateKeyResult = rsaPrivateKeyLoad(saved.privateKeyPem)
      const publicKeyResult = rsaPublicKeyLoad(saved.publicKeyPem)
      if (privateKeyResult.success && publicKeyResult.success) {
        return resultCreate({
          privateKey: privateKeyResult.data,
          publicKey: publicKeyResult.data,
          privateKeyPem: saved.privateKeyPem,
          publicKeyPem: saved.publicKeyPem,
        })
      }
    }
    const values: IdentitySigningKeyInsert = {
      id: 1,
      privateKeyPem: generatedResult.data.privateKeyPem,
      publicKeyPem: generatedResult.data.publicKeyPem,
    }
    database.drizzle.insert(identitySigningKeys).values(values).onConflictDoNothing().run()
    const persisted = database.drizzle
      .select()
      .from(identitySigningKeys)
      .where(eq(identitySigningKeys.id, 1))
      .limit(1)
      .get()
    if (persisted === undefined) return resultErrorCreate(op, "Registration verification key persistence failed.")
    const privateKeyResult = rsaPrivateKeyLoad(persisted.privateKeyPem)
    if (!privateKeyResult.success) return resultErrorCreate(op, "Registration verification key loading failed.")
    const publicKeyResult = rsaPublicKeyLoad(persisted.publicKeyPem)
    if (!publicKeyResult.success) return resultErrorCreate(op, "Registration verification key loading failed.")
    return resultCreate({
      privateKey: privateKeyResult.data,
      publicKey: publicKeyResult.data,
      privateKeyPem: persisted.privateKeyPem,
      publicKeyPem: persisted.publicKeyPem,
    })
  } catch {
    return resultErrorCreate(op, "Registration verification key persistence failed.")
  }
}
