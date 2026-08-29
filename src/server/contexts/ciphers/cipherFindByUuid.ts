import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import { cipherSelect } from "./cipherSelect.js"

export function cipherFindByUuid(database: DatabaseConnection, uuid: string): Result<Cipher | null> {
  const op = "cipherFindByUuid"
  try {
    const row = database.query<Cipher, [string]>(`SELECT ${cipherSelect} FROM ciphers WHERE uuid = ? LIMIT 1`).get(uuid)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Cipher lookup failed.")
  }
}
