import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

const IDENTITY_SSO_AUTH_EXPIRATION_MS = 10 * 60 * 1_000
const IDENTITY_SSO_AUTH_PURGE_BATCH_SIZE = 100

export function identitySsoAuthPurge(database: DatabaseConnection, clock: Clock): Result<number> {
  const op = "identitySsoAuthPurge"
  const now = clock.now().getTime()
  if (!Number.isFinite(now)) return resultErrorCreate(op, "SSO auth purge time is invalid.")
  const cutoff = new Date(now - IDENTITY_SSO_AUTH_EXPIRATION_MS)
  if (Number.isNaN(cutoff.getTime())) return resultErrorCreate(op, "SSO auth purge time is invalid.")
  try {
    const result = database.run("DELETE FROM sso_auth WHERE created_at < ? LIMIT ?", [
      cutoff.toISOString(),
      IDENTITY_SSO_AUTH_PURGE_BATCH_SIZE,
    ])
    return resultCreate(result.changes)
  } catch {
    return resultErrorCreate(op, "SSO auth purge failed.")
  }
}
