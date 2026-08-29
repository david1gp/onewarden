import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

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
    const result = database.run("DELETE FROM event WHERE event_date < ?", [cutoff.toISOString()])
    return resultCreate(result.changes)
  } catch {
    return resultErrorCreate(op, "Event purge failed.")
  }
}
