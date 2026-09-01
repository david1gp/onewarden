import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ssoAuth } from "../../database/schema/ssoAuth.js"
import { eq } from "drizzle-orm"

export function identitySsoAuthDelete(database: DatabaseConnection, state: string): Result<void> {
  const op = "identitySsoAuthDelete"
  try {
    database.drizzle.delete(ssoAuth).where(eq(ssoAuth.state, state)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "SSO auth delete failed.")
  }
}
