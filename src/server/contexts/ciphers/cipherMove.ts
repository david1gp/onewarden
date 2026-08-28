import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { folderFindByUuidAndUser } from "../folders/folderFindByUuidAndUser.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"
import { cipherFolderSet } from "./cipherFolderSet.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"

export function cipherMove(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  folderUuid: string | null,
  clock: Clock,
): Result<boolean> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null || cipherResult.data.userUuid !== userUuid) return resultCreate(false)
  if (folderUuid !== null) {
    const folderResult = folderFindByUuidAndUser(database, folderUuid, userUuid)
    if (!folderResult.success) return folderResult
    if (folderResult.data === null)
      return cipherErrorCreate("cipherMove", "Invalid folder", "Folder does not exist or belongs to another user")
  }
  return databaseTransaction(database, () => {
    const revisionResult = cipherUserRevisionUpdate(database, userUuid, clock.now().toISOString())
    if (!revisionResult.success) return revisionResult
    const folderResult = cipherFolderSet(database, cipherUuid, folderUuid)
    if (!folderResult.success) return folderResult
    return resultCreate(true)
  })
}
