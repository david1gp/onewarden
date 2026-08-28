import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { Folder } from "./folder.js"
import { folderErrorCreate } from "./folderErrorCreate.js"
import { folderFindByUuidAndUser } from "./folderFindByUuidAndUser.js"
import { folderSave } from "./folderSave.js"
import { folderUserRevisionUpdate } from "./folderUserRevisionUpdate.js"

export function folderUpdate(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
  name: string,
  clock: Clock,
): Result<Folder> {
  const folderResult = folderFindByUuidAndUser(database, uuid, userUuid)
  if (!folderResult.success) return folderResult
  if (folderResult.data === null) return folderErrorCreate("folderUpdate")

  const folder = { ...folderResult.data, name, updatedAt: clock.now().toISOString() }
  return databaseTransaction(database, () => {
    const revisionResult = folderUserRevisionUpdate(database, userUuid, folder.updatedAt)
    if (!revisionResult.success) return revisionResult
    const saveResult = folderSave(database, folder)
    if (!saveResult.success) return saveResult
    return resultCreate(folder)
  })
}
