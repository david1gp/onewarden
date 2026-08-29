import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
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
    const placeholders = memberIds.map(() => "?").join(", ")
    try {
      const rows = database
        .query<{ uuid: string }, string[]>(
          `SELECT uuid FROM users_organizations
           WHERE org_uuid = ? AND uuid IN (${placeholders})`,
        )
        .all(organizationUuid, ...memberIds)
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
    database.run("DELETE FROM groups_users WHERE groups_uuid = ?", [groupUuid])
    for (const membershipUuid of memberIds) {
      database.run(
        `INSERT INTO groups_users (groups_uuid, users_organizations_uuid)
         VALUES (?, ?)
         ON CONFLICT(groups_uuid, users_organizations_uuid) DO NOTHING`,
        [groupUuid, membershipUuid],
      )
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
