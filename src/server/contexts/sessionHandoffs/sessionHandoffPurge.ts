import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { extensionSessionHandoffs } from "../../database/schema/extensionSessionHandoffs.js"
import { inArray, lte } from "drizzle-orm"

export function sessionHandoffPurge(database: DatabaseConnection, clock: Clock, batchSize = 1_000): Result<number> {
  const op = "sessionHandoffPurge"
  if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
    return resultErrorCreate(op, "Session handoff purge batch size is invalid.")
  }
  try {
    const expired = database.drizzle
      .select({ tokenHash: extensionSessionHandoffs.tokenHash })
      .from(extensionSessionHandoffs)
      .where(lte(extensionSessionHandoffs.expiresAt, clock.now().toISOString()))
      .orderBy(extensionSessionHandoffs.expiresAt)
      .limit(batchSize)
    const result = database.drizzle
      .delete(extensionSessionHandoffs)
      .where(inArray(extensionSessionHandoffs.tokenHash, expired))
      .returning({ tokenHash: extensionSessionHandoffs.tokenHash })
      .all()
    return resultCreate(result.length)
  } catch {
    return resultErrorCreate(op, "Expired session handoffs could not be purged.")
  }
}
