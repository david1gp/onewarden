import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import { cipherSelect } from "./cipherSelect.js"

export function cipherFindByOrganization(database: DatabaseConnection, organizationUuid: string): Result<Cipher[]> {
  const op = "cipherFindByOrganization"
  try {
    const rows = database
      .query<Cipher, [string]>(
        `SELECT ${cipherSelect}
         FROM ciphers
         WHERE organization_uuid = ?`,
      )
      .all(organizationUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Organization cipher lookup failed.")
  }
}
