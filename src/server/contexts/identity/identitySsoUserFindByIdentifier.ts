import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { ssoUsers } from "../../database/schema/ssoUsers.js"
import { users } from "../../database/schema/users.js"
import { identityUserFromRow } from "./identityUserFromRow.js"
import type { IdentityUser } from "./identityUser.js"

export function identitySsoUserFindByIdentifier(
  database: DatabaseConnection,
  identifier: string,
): Result<{ user: IdentityUser; identifier: string } | null> {
  const op = "identitySsoUserFindByIdentifier"
  try {
    const row = database.drizzle
      .select({ user: users, ssoIdentifier: ssoUsers.identifier })
      .from(users)
      .innerJoin(ssoUsers, eq(ssoUsers.userUuid, users.uuid))
      .where(eq(ssoUsers.identifier, identifier))
      .limit(1)
      .get()
    return resultCreate(
      row === undefined ? null : { user: identityUserFromRow(row.user), identifier: row.ssoIdentifier },
    )
  } catch {
    return resultErrorCreate(op, "SSO user lookup failed.")
  }
}
