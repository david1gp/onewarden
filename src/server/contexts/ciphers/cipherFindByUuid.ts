import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import { cipherFromRow } from "./cipherFromRow.js"
import type { CipherRow } from "./cipherRow.js"

export function cipherFindByUuid(database: DatabaseConnection, uuid: string): Result<Cipher | null> {
  const op = "cipherFindByUuid"
  try {
    const row = database
      .query<CipherRow, [string]>(
        `SELECT uuid, created_at, updated_at, user_uuid, organization_uuid, key, atype,
           name, notes, fields, data, password_history, deleted_at, reprompt
         FROM ciphers WHERE uuid = ? LIMIT 1`,
      )
      .get(uuid)
    return resultCreate(row === null ? null : cipherFromRow(row))
  } catch {
    return resultErrorCreate(op, "Cipher lookup failed.")
  }
}
