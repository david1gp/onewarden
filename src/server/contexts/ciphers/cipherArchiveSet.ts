import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"

export function cipherArchiveSet(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  archivedAt: string,
  revisionDate: string,
): Result<void> {
  const op = "cipherArchiveSet"
  const revisionResult = cipherUserRevisionUpdate(database, userUuid, revisionDate)
  if (!revisionResult.success) return revisionResult
  try {
    database.run(
      `INSERT INTO archives (user_uuid, cipher_uuid, archived_at) VALUES (?, ?, ?)
       ON CONFLICT(user_uuid, cipher_uuid) DO UPDATE SET archived_at = excluded.archived_at`,
      [userUuid, cipherUuid, archivedAt],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher archive update failed.")
  }
}
