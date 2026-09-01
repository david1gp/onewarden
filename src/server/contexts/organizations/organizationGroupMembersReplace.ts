import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq, inArray } from "drizzle-orm"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import { organizationCollectionRevisionUpdate } from "./organizationCollectionRevisionUpdate.js"
import { organizationGroupAffectedUserUuidsFind } from "./organizationGroupAffectedUserUuidsFind.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationGroupMembersReplace(
  database: DatabaseConnection,
  organizationUuid: string,
  groupUuid: string,
  membershipUuids: readonly string[],
  revisionDate: string,
): Result<void> {
  const op = "organizationGroupMembersReplace"
  const memberIds = [...new Set(membershipUuids)]
  if (memberIds.length > 0) {
    try {
      const rows = database.drizzle
        .select({ uuid: usersOrganizations.uuid })
        .from(usersOrganizations)
        .where(and(eq(usersOrganizations.orgUuid, organizationUuid), inArray(usersOrganizations.uuid, memberIds)))
        .all()
      const existingIds = new Set(rows.map((row) => row.uuid))
      const invalidId = memberIds.find((memberId) => !existingIds.has(memberId))
      if (invalidId !== undefined)
        return organizationErrorCreate(op, `Invalid member ${invalidId} for organization ${organizationUuid}`)
    } catch {
      return resultErrorCreate(op, "Organization membership lookup failed.")
    }
  }

  const beforeResult = organizationGroupAffectedUserUuidsFind(database, organizationUuid, groupUuid)
  if (!beforeResult.success) return beforeResult
  try {
    database.drizzle.delete(groupsUsers).where(eq(groupsUsers.groupsUuid, groupUuid)).run()
    for (const membershipUuid of memberIds) {
      database.drizzle
        .insert(groupsUsers)
        .values({ groupsUuid: groupUuid, usersOrganizationsUuid: membershipUuid })
        .onConflictDoNothing()
        .run()
    }
  } catch {
    return resultErrorCreate(op, "Group member update failed.")
  }

  const afterResult = organizationGroupAffectedUserUuidsFind(database, organizationUuid, groupUuid)
  if (!afterResult.success) return afterResult
  const userUuids = [...new Set([...beforeResult.data, ...afterResult.data])]
  const revisionResult = organizationCollectionRevisionUpdate(database, userUuids, revisionDate)
  if (!revisionResult.success) return revisionResult
  return resultCreate(undefined)
}
