import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function twoFactorRecordDelete(database: DatabaseConnection, uuid: string): Result<void> {
  const op = "twoFactorRecordDelete"
  try {
    database.run("DELETE FROM twofactor WHERE uuid = ?", [uuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Two-factor provider delete failed.")
  }
}
