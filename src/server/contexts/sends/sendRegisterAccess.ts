import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Send } from "./send.js"
import { sendUserRevisionUpdate } from "./sendUserRevisionUpdate.js"

export function sendRegisterAccess(database: DatabaseConnection, send: Send, clock: Clock): Result<boolean> {
  const revisionDate = clock.now().toISOString()
  if (send.userUuid !== null) {
    const revisionResult = sendUserRevisionUpdate(database, send.userUuid, revisionDate)
    if (!revisionResult.success) return revisionResult
  }
  try {
    const update = database.run(
      `UPDATE sends
       SET access_count = access_count + 1, revision_date = ?
       WHERE uuid = ?
         AND (max_access_count IS NULL OR access_count < max_access_count)`,
      [revisionDate, send.uuid],
    )
    if (update.changes === 0) return resultCreate(false)
    send.accessCount += 1
    send.revisionDate = revisionDate
    return resultCreate(true)
  } catch {
    return resultErrorCreate("sendRegisterAccess", "Send access registration failed.")
  }
}
