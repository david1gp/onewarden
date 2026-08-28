import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { Cipher } from "./cipher.js"
import { cipherArchiveDelete } from "./cipherArchiveDelete.js"
import { cipherArchiveSet } from "./cipherArchiveSet.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"

export function cipherArchive(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  archived: boolean,
  clock: Clock,
): Result<Cipher> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null) return cipherErrorCreate("cipherArchive", "Cipher doesn't exist")
  const cipher = cipherResult.data
  if (cipher.userUuid !== userUuid)
    return cipherErrorCreate("cipherArchive", "Cipher is not accessible for the current user")
  const now = clock.now().toISOString()
  const archiveResult = archived
    ? cipherArchiveSet(database, cipherUuid, userUuid, now, now)
    : cipherArchiveDelete(database, cipherUuid, userUuid, now)
  if (!archiveResult.success) return archiveResult
  return resultCreate(cipher)
}
