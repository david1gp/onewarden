import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function cipherCollectionIdsFindByOrganization(
  database: DatabaseConnection,
  cipherUuid: string,
  organizationUuid: string,
): Result<string[]> {
  const op = "cipherCollectionIdsFindByOrganization"
  try {
    const rows = database
      .query<CipherCollectionIdRow, [string, string]>(
        `SELECT cc.collection_uuid
         FROM ciphers_collections AS cc
         JOIN collections AS c ON c.uuid = cc.collection_uuid AND c.org_uuid = ?
         WHERE cc.cipher_uuid = ?
         ORDER BY cc.collection_uuid`,
      )
      .all(organizationUuid, cipherUuid)
    return resultCreate(rows.map((row) => row.collection_uuid))
  } catch {
    return resultErrorCreate(op, "Organization cipher collection lookup failed.")
  }
}

type CipherCollectionIdRow = {
  collection_uuid: string
}
