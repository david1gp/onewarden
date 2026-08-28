import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function cipherArchiveFind(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
): Result<string | null> {
  const op = "cipherArchiveFind"
  try {
    const row = database
      .query<{ archived_at: string }, [string, string]>(
        "SELECT archived_at FROM archives WHERE cipher_uuid = ? AND user_uuid = ? LIMIT 1",
      )
      .get(cipherUuid, userUuid)
    return resultCreate(row === null ? null : row.archived_at)
  } catch {
    return resultErrorCreate(op, "Cipher archive lookup failed.")
  }
}
