import type { Result } from "#result"
import { and, eq, isNull } from "drizzle-orm"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ssoAuth } from "../../database/schema/ssoAuth.js"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"

export function identitySsoAuthCallbackResponseSave(
  database: DatabaseConnection,
  auth: IdentitySsoAuth,
): Result<boolean> {
  const op = "identitySsoAuthCallbackResponseSave"
  if (auth.codeResponse === null) return resultErrorCreate(op, "SSO callback response is missing.")
  try {
    const row = database.drizzle
      .update(ssoAuth)
      .set({
        codeResponse: auth.codeResponse,
        codeResponseError: auth.codeResponseError === null ? null : JSON.stringify(auth.codeResponseError),
        updatedAt: auth.updatedAt,
      })
      .where(
        and(
          eq(ssoAuth.state, auth.state),
          eq(ssoAuth.createdAt, auth.createdAt),
          isNull(ssoAuth.codeResponse),
          isNull(ssoAuth.authResponse),
        ),
      )
      .returning({ state: ssoAuth.state })
      .get()
    return resultCreate(row !== undefined)
  } catch {
    return resultErrorCreate(op, "SSO callback response save failed.")
  }
}
