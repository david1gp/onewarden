import { lt } from "drizzle-orm"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { sends } from "../../database/schema/sends.js"
import type { Send } from "./send.js"
import { sendFromRow } from "./sendFromRow.js"

export function sendFindByPastDeletionDate(database: DatabaseConnection, clock: Clock): Result<Send[]> {
  const op = "sendFindByPastDeletionDate"
  try {
    const rows = database.drizzle.select().from(sends).where(lt(sends.deletionDate, clock.now().toISOString())).all()
    return resultCreate(rows.map(sendFromRow))
  } catch {
    return resultErrorCreate(op, "Send lookup failed.")
  }
}
