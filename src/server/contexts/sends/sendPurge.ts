import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { SendFileStorageAdapter } from "./sendFileStorageAdapter.js"
import { sendFindByPastDeletionDate } from "./sendFindByPastDeletionDate.js"
import { sendRecipientVerificationDelete } from "./sendRecipientVerificationDelete.js"
import { sendUserRevisionUpdate } from "./sendUserRevisionUpdate.js"

export async function sendPurge(
  database: DatabaseConnection,
  clock: Clock,
  storage: SendFileStorageAdapter,
): Promise<Result<number>> {
  const sendsResult = sendFindByPastDeletionDate(database, clock)
  if (!sendsResult.success) return sendsResult
  let deleted = 0
  for (const send of sendsResult.data) {
    if (send.type === 1) {
      const storageResult = await storage.delete(send.uuid)
      if (!storageResult.success) return storageResult
    }
    try {
      if (send.userUuid !== null) {
        const revisionResult = sendUserRevisionUpdate(database, send.userUuid, clock.now().toISOString())
        if (!revisionResult.success) return revisionResult
      }
      const verificationDeleteResult = sendRecipientVerificationDelete(database, send.uuid)
      if (!verificationDeleteResult.success) return verificationDeleteResult
      database.run("DELETE FROM sends WHERE uuid = ?", [send.uuid])
      deleted += 1
    } catch {
      return resultErrorCreate("sendPurge", "Send purge failed.")
    }
  }
  return resultCreate(deleted)
}
