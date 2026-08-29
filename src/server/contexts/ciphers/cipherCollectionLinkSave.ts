import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function cipherCollectionLinkSave(
  database: DatabaseConnection,
  cipherUuid: string,
  collectionUuid: string,
): Result<void> {
  const op = "cipherCollectionLinkSave"
  try {
    database.run("INSERT OR IGNORE INTO ciphers_collections (cipher_uuid, collection_uuid) VALUES (?, ?)", [
      cipherUuid,
      collectionUuid,
    ])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher collection assignment failed.")
  }
}
