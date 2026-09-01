import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authRequests } from "../../database/schema/authRequests.js"
import { lt } from "drizzle-orm"

export function identityAuthRequestPurge(database: DatabaseConnection, clock: Clock): Result<number> {
  const op = "identityAuthRequestPurge"
  try {
    const now = clock.now().getTime()
    if (!Number.isFinite(now)) return resultErrorCreate(op, "Auth request purge time is invalid.")
    const cutoff = new Date(now - 15 * 60 * 1_000)
    if (Number.isNaN(cutoff.getTime())) return resultErrorCreate(op, "Auth request purge time is invalid.")
    const result = database.drizzle
      .delete(authRequests)
      .where(lt(authRequests.creationDate, cutoff.toISOString()))
      .returning({ uuid: authRequests.uuid })
      .all()
    return resultCreate(result.length)
  } catch {
    return resultErrorCreate(op, "Auth request purge failed.")
  }
}
