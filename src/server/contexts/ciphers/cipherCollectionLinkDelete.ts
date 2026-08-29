import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function cipherCollectionLinkDelete(
  database: DatabaseConnection,
  cipherUuid: string,
  collectionUuid: string,
): Result<void> {
  const op = "cipherCollectionLinkDelete"
  try {
    database.run("DELETE FROM ciphers_collections WHERE cipher_uuid = ? AND collection_uuid = ?", [
      cipherUuid,
      collectionUuid,
    ])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher collection assignment removal failed.")
  }
}
