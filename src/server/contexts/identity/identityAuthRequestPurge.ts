import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function identityAuthRequestPurge(database: DatabaseConnection, clock: Clock): Result<number> {
  const op = "identityAuthRequestPurge"
  try {
    const now = clock.now().getTime()
    if (!Number.isFinite(now)) return resultErrorCreate(op, "Auth request purge time is invalid.")
    const cutoff = new Date(now - 15 * 60 * 1_000)
    if (Number.isNaN(cutoff.getTime())) return resultErrorCreate(op, "Auth request purge time is invalid.")
    const result = database.run("DELETE FROM auth_requests WHERE creation_date < ?", [cutoff.toISOString()])
    return resultCreate(result.changes)
  } catch {
    return resultErrorCreate(op, "Auth request purge failed.")
  }
}
