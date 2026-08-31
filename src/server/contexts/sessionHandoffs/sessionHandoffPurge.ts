import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function sessionHandoffPurge(database: DatabaseConnection, clock: Clock, batchSize = 1_000): Result<number> {
  const op = "sessionHandoffPurge"
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
    return resultErrorCreate(op, "Session handoff purge batch size is invalid.")
  }
  try {
    const result = database.run(
      `DELETE FROM extension_session_handoffs
       WHERE token_hash IN (
         SELECT token_hash FROM extension_session_handoffs
         WHERE expires_at <= ? ORDER BY expires_at LIMIT ?
       )`,
      [clock.now().toISOString(), batchSize],
    )
    return resultCreate(result.changes)
  } catch {
    return resultErrorCreate(op, "Expired session handoffs could not be purged.")
  }
}
