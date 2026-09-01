import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { asc, eq } from "drizzle-orm"
import { usersOrganizations, type UserOrganizationRow } from "../../database/schema/usersOrganizations.js"
import { organizationMembershipFromRow } from "./organizationMembershipFromRow.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"

export function organizationMembershipFindAllByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationMembership[]> {
  const op = "organizationMembershipFindAllByOrganization"
  try {
    const rows: UserOrganizationRow[] = database.drizzle
      .select()
      .from(usersOrganizations)
      .where(eq(usersOrganizations.orgUuid, organizationUuid))
      .orderBy(asc(usersOrganizations.uuid))
      .all()
    return resultCreate(rows.map(organizationMembershipFromRow))
  } catch {
    return resultErrorCreate(op, "Organization membership lookup failed.")
  }
}
