import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq, gte } from "drizzle-orm"
import { ssoAuth } from "../../database/schema/ssoAuth.js"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"
import { identitySsoAuthFromRow } from "./identitySsoAuthFromRow.js"

export function identitySsoAuthFindByCode(
  database: DatabaseConnection,
  code: string,
  clock: Clock,
): Result<IdentitySsoAuth | null> {
  const op = "identitySsoAuthFindByCode"
  try {
    const oldest = new Date(clock.now().getTime() - 10 * 60 * 1_000).toISOString()
    const row = database.drizzle
      .select()
      .from(ssoAuth)
      .where(and(eq(ssoAuth.codeResponse, code), gte(ssoAuth.createdAt, oldest)))
      .limit(1)
      .get()
    if (row === undefined) return resultCreate(null)
    const authResult = identitySsoAuthFromRow(row)
    if (!authResult.success) return resultErrorCreate(op, "SSO auth lookup failed.")
    return authResult
  } catch {
    return resultErrorCreate(op, "SSO auth lookup failed.")
  }
}
