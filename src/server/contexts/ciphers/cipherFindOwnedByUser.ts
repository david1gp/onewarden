import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import { cipherSelect } from "./cipherSelect.js"

export function cipherFindOwnedByUser(database: DatabaseConnection, userUuid: string): Result<Cipher[]> {
  const op = "cipherFindOwnedByUser"
  try {
    const rows = database
      .query<Cipher, [string]>(`SELECT ${cipherSelect} FROM ciphers WHERE user_uuid = ?`)
      .all(userUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Owned cipher lookup failed.")
  }
}
