import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Send } from "./send.js"
import type { SendFileStorageAdapter } from "./sendFileStorageAdapter.js"
import { sendFindByUuidAndUser } from "./sendFindByUuidAndUser.js"
import { sendRecipientVerificationDelete } from "./sendRecipientVerificationDelete.js"
import { sendUserRevisionUpdate } from "./sendUserRevisionUpdate.js"

export async function sendDelete(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
  clock: Clock,
  storage: SendFileStorageAdapter,
): Promise<Result<Send>> {
  const sendResult = sendFindByUuidAndUser(database, uuid, userUuid)
  if (!sendResult.success) return sendResult
  if (sendResult.data === null) return resultErrorCreate("sendDelete", "Send not found.")
  const send = sendResult.data
  if (send.type === 1) {
    const storageResult = await storage.delete(send.uuid)
    if (!storageResult.success) return storageResult
  }
  return databaseTransaction(database, () => {
    const revisionResult = sendUserRevisionUpdate(database, userUuid, clock.now().toISOString())
    if (!revisionResult.success) return revisionResult
    const verificationDeleteResult = sendRecipientVerificationDelete(database, uuid)
    if (!verificationDeleteResult.success) return verificationDeleteResult
    try {
      database.run("DELETE FROM sends WHERE uuid = ? AND user_uuid = ?", [uuid, userUuid])
      return resultCreate(send)
    } catch {
      return resultErrorCreate("sendDelete", "Send delete failed.")
    }
  })
}
