import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, eq } from "drizzle-orm"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"

export function organizationMembershipGroupAssignmentsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
): Result<string[]> {
  const op = "organizationMembershipGroupAssignmentsFind"
  try {
    const rows = database.drizzle
      .select({ groupUuid: groupsUsers.groupsUuid })
      .from(groupsUsers)
      .innerJoin(groups, eq(groups.uuid, groupsUsers.groupsUuid))
      .where(
        and(eq(groupsUsers.usersOrganizationsUuid, membershipUuid), eq(groups.organizationsUuid, organizationUuid)),
      )
      .orderBy(asc(groupsUsers.groupsUuid))
      .all()
    return resultCreate(rows.map((row) => row.groupUuid))
  } catch {
    return resultErrorCreate(op, "Organization group assignment lookup failed.")
  }
}
