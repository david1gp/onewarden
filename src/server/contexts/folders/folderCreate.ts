import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { Folder } from "./folder.js"
import { folderSave } from "./folderSave.js"
import { folderUserRevisionUpdate } from "./folderUserRevisionUpdate.js"

export function folderCreate(
  database: DatabaseConnection,
  userUuid: string,
  name: string,
  clock: Clock,
  identifier: Identifier,
): Result<Folder> {
  const now = clock.now().toISOString()
  const folder: Folder = {
    uuid: identifier.uuid(),
    createdAt: now,
    updatedAt: now,
    userUuid,
    name,
  }

  return databaseTransaction(database, () => {
    const revisionResult = folderUserRevisionUpdate(database, userUuid, now)
    if (!revisionResult.success) return revisionResult
    const saveResult = folderSave(database, folder)
    if (!saveResult.success) return saveResult
    return resultCreate(folder)
  })
}
