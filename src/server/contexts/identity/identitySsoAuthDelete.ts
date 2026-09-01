import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ssoAuth } from "../../database/schema/ssoAuth.js"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"
import { and, eq, isNull } from "drizzle-orm"

export function identitySsoAuthDelete(database: DatabaseConnection, auth: IdentitySsoAuth): Result<void> {
  const op = "identitySsoAuthDelete"
  try {
    const codeCondition =
      auth.codeResponse === null ? isNull(ssoAuth.codeResponse) : eq(ssoAuth.codeResponse, auth.codeResponse)
    const responseCondition =
      auth.authResponse === null
        ? isNull(ssoAuth.authResponse)
        : eq(ssoAuth.authResponse, JSON.stringify(auth.authResponse))
    database.drizzle
      .delete(ssoAuth)
      .where(
        and(eq(ssoAuth.state, auth.state), eq(ssoAuth.createdAt, auth.createdAt), codeCondition, responseCondition),
      )
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "SSO auth delete failed.")
  }
}
