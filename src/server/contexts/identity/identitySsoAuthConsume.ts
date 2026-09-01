import type { Result } from "#result"
import { and, eq, gte, isNotNull } from "drizzle-orm"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { ssoAuth } from "../../database/schema/ssoAuth.js"

export function identitySsoAuthConsume(
  database: DatabaseConnection,
  state: string,
  code: string,
  clock: Clock,
): Result<boolean> {
  const op = "identitySsoAuthConsume"
  const oldest = new Date(clock.now().getTime() - 10 * 60 * 1_000).toISOString()
  return databaseTransaction(database, () => {
    try {
      const row = database.drizzle
        .delete(ssoAuth)
        .where(
          and(
            eq(ssoAuth.state, state),
            eq(ssoAuth.codeResponse, code),
            isNotNull(ssoAuth.authResponse),
            gte(ssoAuth.createdAt, oldest),
          ),
        )
        .returning({ state: ssoAuth.state })
        .get()
      return resultCreate(row !== undefined)
    } catch {
      return resultErrorCreate(op, "SSO auth consumption failed.")
    }
  })
}
