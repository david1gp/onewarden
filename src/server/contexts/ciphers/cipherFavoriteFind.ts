import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function cipherFavoriteFind(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
): Result<boolean> {
  const op = "cipherFavoriteFind"
  try {
    const row = database
      .query<{ count: number }, [string, string]>(
        "SELECT COUNT(*) AS count FROM favorites WHERE cipher_uuid = ? AND user_uuid = ?",
      )
      .get(cipherUuid, userUuid)
    return resultCreate((row?.count ?? 0) > 0)
  } catch {
    return resultErrorCreate(op, "Cipher favorite lookup failed.")
  }
}
