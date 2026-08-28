import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { Folder } from "./folder.js"
import { folderCipherDeleteAllByFolder } from "./folderCipherDeleteAllByFolder.js"
import { folderErrorCreate } from "./folderErrorCreate.js"
import { folderFindByUuidAndUser } from "./folderFindByUuidAndUser.js"
import { folderUserRevisionUpdate } from "./folderUserRevisionUpdate.js"

export function folderDelete(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
  clock: Clock,
): Result<Folder> {
  const folderResult = folderFindByUuidAndUser(database, uuid, userUuid)
  if (!folderResult.success) return folderResult
  if (folderResult.data === null) return folderErrorCreate("folderDelete")
  const folder = folderResult.data

  const deleteResult = databaseTransaction(database, () => {
    const revisionResult = folderUserRevisionUpdate(database, userUuid, clock.now().toISOString())
    if (!revisionResult.success) return revisionResult
    const mappingResult = folderCipherDeleteAllByFolder(database, folder.uuid)
    if (!mappingResult.success) return mappingResult
    try {
      database.run("DELETE FROM folders WHERE uuid = ? AND user_uuid = ?", [folder.uuid, userUuid])
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("folderDeletePersistence", "Folder delete failed.")
    }
  })
  if (!deleteResult.success) return deleteResult
  return resultCreate(folder)
}
