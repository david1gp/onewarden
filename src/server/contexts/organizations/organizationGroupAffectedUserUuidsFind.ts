import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, eq } from "drizzle-orm"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

export function organizationGroupAffectedUserUuidsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  groupUuid: string,
): Result<string[]> {
  const op = "organizationGroupAffectedUserUuidsFind"
  try {
    const rows = database.drizzle
      .selectDistinct({ userUuid: usersOrganizations.userUuid })
      .from(groupsUsers)
      .innerJoin(groups, and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, organizationUuid)))
      .innerJoin(
        usersOrganizations,
        and(
          eq(usersOrganizations.uuid, groupsUsers.usersOrganizationsUuid),
          eq(usersOrganizations.orgUuid, groups.organizationsUuid),
        ),
      )
      .where(eq(groupsUsers.groupsUuid, groupUuid))
      .orderBy(asc(usersOrganizations.userUuid))
      .all()
    return resultCreate(rows.map((row) => row.userUuid))
  } catch {
    return resultErrorCreate(op, "Group member revision lookup failed.")
  }
}
