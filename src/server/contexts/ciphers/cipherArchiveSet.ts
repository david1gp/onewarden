import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type ArchiveInsert, archives } from "../../database/schema/archives.js"
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
    const values: ArchiveInsert = { userUuid, cipherUuid, archivedAt }
    database.drizzle
      .insert(archives)
      .values(values)
      .onConflictDoUpdate({ target: [archives.userUuid, archives.cipherUuid], set: { archivedAt: values.archivedAt } })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher archive update failed.")
  }
}
