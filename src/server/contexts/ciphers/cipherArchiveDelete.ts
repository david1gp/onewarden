import { and, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { archives } from "../../database/schema/archives.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"

export function cipherArchiveDelete(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  revisionDate: string,
): Result<void> {
  const op = "cipherArchiveDelete"
  const revisionResult = cipherUserRevisionUpdate(database, userUuid, revisionDate)
  if (!revisionResult.success) return revisionResult
  try {
    database.drizzle
      .delete(archives)
      .where(and(eq(archives.userUuid, userUuid), eq(archives.cipherUuid, cipherUuid)))
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Cipher archive update failed.")
  }
}
