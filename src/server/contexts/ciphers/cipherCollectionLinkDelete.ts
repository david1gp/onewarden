import { and, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ciphersCollections } from "../../database/schema/ciphersCollections.js"

export function cipherCollectionLinkDelete(
  database: DatabaseConnection,
  cipherUuid: string,
  collectionUuid: string,
): Result<void> {
  const op = "cipherCollectionLinkDelete"
  try {
    database.drizzle
      .delete(ciphersCollections)
      .where(and(eq(ciphersCollections.cipherUuid, cipherUuid), eq(ciphersCollections.collectionUuid, collectionUuid)))
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher collection assignment removal failed.")
  }
}
