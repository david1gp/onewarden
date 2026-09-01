import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { usersOrganizations, type UserOrganizationRow } from "../../database/schema/usersOrganizations.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipFromRow } from "./organizationMembershipFromRow.js"

export function organizationMembershipFindByUuidAndOrganization(
  database: DatabaseConnection,
  membershipUuid: string,
  organizationUuid: string,
): Result<OrganizationMembership | null> {
  const op = "organizationMembershipFindByUuidAndOrganization"
  try {
    const row: UserOrganizationRow | undefined = database.drizzle
      .select()
      .from(usersOrganizations)
      .where(and(eq(usersOrganizations.uuid, membershipUuid), eq(usersOrganizations.orgUuid, organizationUuid)))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : organizationMembershipFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization membership lookup failed.")
  }
}
