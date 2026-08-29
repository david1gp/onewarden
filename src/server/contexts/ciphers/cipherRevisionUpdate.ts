import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"
import { cipherUserUuidsFind } from "./cipherUserUuidsFind.js"

export function cipherRevisionUpdate(
  database: DatabaseConnection,
  cipher: Cipher,
  revisionDate: string,
  groupsEnabled = false,
  fallbackUserUuid?: string,
): Result<void> {
  const usersResult = cipherUserUuidsFind(database, cipher, groupsEnabled)
  if (!usersResult.success) return usersResult
  const userUuids = new Set(usersResult.data)
  if (fallbackUserUuid !== undefined) userUuids.add(fallbackUserUuid)
  for (const userUuid of userUuids) {
    const revisionResult = cipherUserRevisionUpdate(database, userUuid, revisionDate)
    if (!revisionResult.success) return revisionResult
  }
  return resultCreate(undefined)
}
