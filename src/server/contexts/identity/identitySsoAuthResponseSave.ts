import type { Result } from "#result"
import { and, eq, isNull } from "drizzle-orm"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ssoAuth } from "../../database/schema/ssoAuth.js"
import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"

export function identitySsoAuthResponseSave(
  database: DatabaseConnection,
  state: string,
  code: string,
  authenticatedUser: IdentitySsoAuthenticatedUser,
  updatedAt: string,
): Result<boolean> {
  const op = "identitySsoAuthResponseSave"
  try {
    const row = database.drizzle
      .update(ssoAuth)
      .set({ authResponse: JSON.stringify(authenticatedUser), updatedAt })
      .where(and(eq(ssoAuth.state, state), eq(ssoAuth.codeResponse, code), isNull(ssoAuth.authResponse)))
      .returning({ state: ssoAuth.state })
      .get()
    return resultCreate(row !== undefined)
  } catch {
    return resultErrorCreate(op, "SSO auth response save failed.")
  }
}
