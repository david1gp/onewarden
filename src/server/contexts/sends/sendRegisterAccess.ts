import { and, eq, isNull, lt, or, sql } from "drizzle-orm"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { sends } from "../../database/schema/sends.js"
import type { Send } from "./send.js"
import { sendUserRevisionUpdate } from "./sendUserRevisionUpdate.js"

export function sendRegisterAccess(database: DatabaseConnection, send: Send, clock: Clock): Result<boolean> {
  const revisionDate = clock.now().toISOString()
  if (send.userUuid !== null) {
    const revisionResult = sendUserRevisionUpdate(database, send.userUuid, revisionDate)
    if (!revisionResult.success) return revisionResult
  }
  try {
    const update = database.drizzle
      .update(sends)
      .set({
        accessCount: sql`${sends.accessCount} + 1`,
        revisionDate,
      })
      .where(
        and(eq(sends.uuid, send.uuid), or(isNull(sends.maxAccessCount), lt(sends.accessCount, sends.maxAccessCount))),
      )
      .returning({ uuid: sends.uuid })
      .all()
    if (update.length === 0) return resultCreate(false)
    send.accessCount += 1
    send.revisionDate = revisionDate
    return resultCreate(true)
  } catch {
    return resultErrorCreate("sendRegisterAccess", "Send access registration failed.")
  }
}
