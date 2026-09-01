import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type CipherCollectionInsert, ciphersCollections } from "../../database/schema/ciphersCollections.js"

export function cipherCollectionLinkSave(
  database: DatabaseConnection,
  cipherUuid: string,
  collectionUuid: string,
): Result<void> {
  const op = "cipherCollectionLinkSave"
  try {
    const values: CipherCollectionInsert = { cipherUuid, collectionUuid }
    database.drizzle.insert(ciphersCollections).values(values).onConflictDoNothing().run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher collection assignment failed.")
  }
}
