import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
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
    const placeholders = groupIds.map(() => "?").join(", ")
    try {
      const rows = database
        .query<{ uuid: string }, string[]>(
          `SELECT uuid FROM groups WHERE organizations_uuid = ? AND uuid IN (${placeholders})`,
        )
        .all(organizationUuid, ...groupIds)
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
    const placeholders = userIds.map(() => "?").join(", ")
    try {
      const rows = database
        .query<OrganizationCollectionUserAssignmentRow, string[]>(
          `SELECT uuid, user_uuid, access_all
           FROM users_organizations
           WHERE org_uuid = ? AND uuid IN (${placeholders})`,
        )
        .all(organizationUuid, ...userIds)
      const targets = new Map(rows.map((row) => [row.uuid, row]))
      for (const userId of userIds) {
        const target = targets.get(userId)
        if (target === undefined)
          return organizationErrorCreate("organizationCollectionAssignmentsResolve", "User is not part of organization")
        userTargets.push({
          accessAll: target.access_all === 1,
          membershipUuid: userId,
          userUuid: target.user_uuid,
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

type OrganizationCollectionUserAssignmentRow = {
  access_all: number
  user_uuid: string
  uuid: string
}
