import { and, eq, inArray } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { groups as groupsTable } from "../../database/schema/groups.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationCollectionAccessData } from "./organizationCollectionAccessDataSchema.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationCollectionAssignmentsResolve(
  database: DatabaseConnection,
  organizationUuid: string,
  groups: readonly OrganizationCollectionAccessData[],
  users: readonly OrganizationCollectionAccessData[],
): Result<OrganizationCollectionAssignmentTargets> {
  const groupIds = [...new Set(groups.map((group) => group.id))]
  if (groupIds.length > 0) {
    try {
      const rows = database.drizzle
        .select({ uuid: groupsTable.uuid })
        .from(groupsTable)
        .where(and(eq(groupsTable.organizationsUuid, organizationUuid), inArray(groupsTable.uuid, groupIds)))
        .all()
      const existingIds = new Set(rows.map((row) => row.uuid))
      const invalidGroup = groupIds.find((groupId) => !existingIds.has(groupId))
      if (invalidGroup !== undefined)
        return organizationErrorCreate(
          "organizationCollectionAssignmentsResolve",
          `Invalid group ${invalidGroup} for organization ${organizationUuid}`,
        )
    } catch {
      return organizationErrorCreate("organizationCollectionAssignmentsResolve", "Group lookup failed.")
    }
  }

  const userIds = [...new Set(users.map((user) => user.id))]
  const userTargets: OrganizationCollectionUserAssignmentTarget[] = []
  if (userIds.length > 0) {
    try {
      const rows = database.drizzle
        .select({
          accessAll: usersOrganizations.accessAll,
          userUuid: usersOrganizations.userUuid,
          uuid: usersOrganizations.uuid,
        })
        .from(usersOrganizations)
        .where(and(eq(usersOrganizations.orgUuid, organizationUuid), inArray(usersOrganizations.uuid, userIds)))
        .all()
      const targets = new Map(rows.map((row) => [row.uuid, row]))
      for (const userId of userIds) {
        const target = targets.get(userId)
        if (target === undefined)
          return organizationErrorCreate("organizationCollectionAssignmentsResolve", "User is not part of organization")
        userTargets.push({
          accessAll: target.accessAll,
          membershipUuid: userId,
          userUuid: target.userUuid,
        })
      }
    } catch {
      return organizationErrorCreate("organizationCollectionAssignmentsResolve", "Organization member lookup failed.")
    }
  }

  return resultCreate({ groupIds, userTargets })
}

type OrganizationCollectionAssignmentTargets = {
  groupIds: readonly string[]
  userTargets: readonly OrganizationCollectionUserAssignmentTarget[]
}

type OrganizationCollectionUserAssignmentTarget = {
  accessAll: boolean
  membershipUuid: string
  userUuid: string
}
