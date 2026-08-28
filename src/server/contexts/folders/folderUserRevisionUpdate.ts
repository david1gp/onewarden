import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function folderUserRevisionUpdate(
  database: DatabaseConnection,
  userUuid: string,
  revisionDate: string,
): Result<void> {
  const op = "folderUserRevisionUpdate"
  try {
    database.run("UPDATE users SET updated_at = ? WHERE uuid = ?", [revisionDate, userUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "User revision update failed.")
  }
}
