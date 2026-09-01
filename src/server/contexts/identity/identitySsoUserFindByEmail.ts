import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { ssoUsers } from "../../database/schema/ssoUsers.js"
import { users } from "../../database/schema/users.js"
import { identityUserFromRow } from "./identityUserFromRow.js"
import type { IdentityUser } from "./identityUser.js"

export function identitySsoUserFindByEmail(
  database: DatabaseConnection,
  email: string,
): Result<{ user: IdentityUser; identifier: string | null } | null> {
  const op = "identitySsoUserFindByEmail"
  try {
    const row = database.drizzle
      .select({ user: users, ssoIdentifier: ssoUsers.identifier })
      .from(users)
      .leftJoin(ssoUsers, eq(ssoUsers.userUuid, users.uuid))
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)
      .get()
    return resultCreate(
      row === undefined ? null : { user: identityUserFromRow(row.user), identifier: row.ssoIdentifier },
    )
  } catch {
    return resultErrorCreate(op, "SSO user lookup failed.")
  }
}
