import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import { cipherFromRow } from "./cipherFromRow.js"
import type { CipherRow } from "./cipherRow.js"

export function cipherFindByUser(database: DatabaseConnection, userUuid: string): Result<Cipher[]> {
  const op = "cipherFindByUser"
  try {
    const rows = database
      .query<CipherRow, [string]>(
        `SELECT uuid, created_at, updated_at, user_uuid, organization_uuid, key, atype,
           name, notes, fields, data, password_history, deleted_at, reprompt
         FROM ciphers WHERE user_uuid = ? ORDER BY created_at, uuid`,
      )
      .all(userUuid)
    return resultCreate(rows.map(cipherFromRow))
  } catch {
    return resultErrorCreate(op, "Cipher lookup failed.")
  }
}
