import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { asc, and, eq, ne } from "drizzle-orm"
import { usersOrganizations, type UserOrganizationRow } from "../../database/schema/usersOrganizations.js"
import { organizationMembershipFromRow } from "./organizationMembershipFromRow.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"

export function organizationMembershipFindMainByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<OrganizationMembership | null> {
  const op = "organizationMembershipFindMainByUser"
  try {
    const row: UserOrganizationRow | undefined = database.drizzle
      .select()
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.userUuid, userUuid),
          ne(usersOrganizations.status, organizationMembershipStatus.revoked),
        ),
      )
      .orderBy(asc(usersOrganizations.atype))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : organizationMembershipFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization membership lookup failed.")
  }
}
