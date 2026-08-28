import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"

export function cipherFavoriteSet(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  favorite: boolean | null | undefined,
  revisionDate: string,
): Result<void> {
  const op = "cipherFavoriteSet"
  if (favorite === undefined || favorite === null) return resultCreate(undefined)
  try {
    const row = database
      .query<{ count: number }, [string, string]>(
        "SELECT COUNT(*) AS count FROM favorites WHERE cipher_uuid = ? AND user_uuid = ?",
      )
      .get(cipherUuid, userUuid)
    const current = (row?.count ?? 0) > 0
    if (current === favorite) return resultCreate(undefined)
    const revisionResult = cipherUserRevisionUpdate(database, userUuid, revisionDate)
    if (!revisionResult.success) return revisionResult
    if (favorite) {
      database.run("INSERT INTO favorites (user_uuid, cipher_uuid) VALUES (?, ?)", [userUuid, cipherUuid])
    } else {
      database.run("DELETE FROM favorites WHERE user_uuid = ? AND cipher_uuid = ?", [userUuid, cipherUuid])
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher favorite update failed.")
  }
}
