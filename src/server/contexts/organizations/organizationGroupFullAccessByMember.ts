import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"

export function organizationGroupFullAccessByMember(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
): Result<boolean> {
  const op = "organizationGroupFullAccessByMember"
  try {
    const row = database.drizzle
      .select({ accessAll: groups.accessAll })
      .from(groupsUsers)
      .innerJoin(groups, and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, organizationUuid)))
      .where(and(eq(groupsUsers.usersOrganizationsUuid, membershipUuid), eq(groups.accessAll, true)))
      .limit(1)
      .get()
    return resultCreate(row !== undefined && row.accessAll)
  } catch {
    return resultErrorCreate(op, "Group access lookup failed.")
  }
}
