import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { users } from "../../database/schema/users.js"
import { identityUserFromRow } from "./identityUserFromRow.js"
import type { IdentityUser } from "./identityUser.js"

export function identityUserFindByUuid(database: DatabaseConnection, uuid: string): Result<IdentityUser | null> {
  const op = "identityUserFindByUuid"
  try {
    const row = database.drizzle.select().from(users).where(eq(users.uuid, uuid)).limit(1).get()
    return resultCreate(row === undefined ? null : identityUserFromRow(row))
  } catch {
    return resultErrorCreate(op, "User lookup failed.")
  }
}
