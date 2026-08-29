import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationCollectionRevisionUpdate(
  database: DatabaseConnection,
  userUuids: readonly string[],
  revisionDate: string,
): Result<void> {
  const op = "organizationCollectionRevisionUpdate"
  if (userUuids.length === 0) return resultCreate(undefined)
  try {
    const placeholders = userUuids.map(() => "?").join(", ")
    database.run(`UPDATE users SET updated_at = ? WHERE uuid IN (${placeholders})`, [revisionDate, ...userUuids])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Collection user revision update failed.")
  }
}
