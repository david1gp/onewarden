import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { lt } from "drizzle-orm"
import { event as eventTable } from "../../database/schema/event.js"

export function eventPurge(
  database: DatabaseConnection,
  clock: Clock,
  daysToRetain: number | undefined,
): Result<number> {
  const op = "eventPurge"
  if (daysToRetain === undefined) return resultCreate(0)
  if (!Number.isSafeInteger(daysToRetain) || daysToRetain < 0)
    return resultErrorCreate(op, "Event retention must be a non-negative integer.")
  try {
    const now = clock.now().getTime()
    if (!Number.isFinite(now)) return resultErrorCreate(op, "Event purge time is invalid.")
    const cutoff = new Date(now - daysToRetain * 24 * 60 * 60 * 1_000)
    if (Number.isNaN(cutoff.getTime())) return resultErrorCreate(op, "Event purge time is invalid.")
    const rows = database.drizzle
      .delete(eventTable)
      .where(lt(eventTable.eventDate, cutoff.toISOString()))
      .returning({ uuid: eventTable.uuid })
      .all()
    return resultCreate(rows.length)
  } catch {
    return resultErrorCreate(op, "Event purge failed.")
  }
}
