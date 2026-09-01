import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { asc, eq } from "drizzle-orm"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

export function organizationMemberUserUuidsFind(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<string[]> {
  const op = "organizationMemberUserUuidsFind"
  try {
    const rows = database.drizzle
      .select({ userUuid: usersOrganizations.userUuid })
      .from(usersOrganizations)
      .where(eq(usersOrganizations.orgUuid, organizationUuid))
      .orderBy(asc(usersOrganizations.userUuid))
      .all()
    return resultCreate(rows.map((row) => row.userUuid))
  } catch {
    return resultErrorCreate(op, "Organization member lookup failed.")
  }
}
