import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function cipherDeleteDependencies(database: DatabaseConnection, cipherUuid: string): Result<void> {
  const op = "cipherDeleteDependencies"
  try {
    database.run("DELETE FROM folders_ciphers WHERE cipher_uuid = ?", [cipherUuid])
    database.run("DELETE FROM favorites WHERE cipher_uuid = ?", [cipherUuid])
    database.run("DELETE FROM archives WHERE cipher_uuid = ?", [cipherUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher dependency deletion failed.")
  }
}
