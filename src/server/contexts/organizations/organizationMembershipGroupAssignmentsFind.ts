import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationMembershipGroupAssignmentsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
): Result<string[]> {
  const op = "organizationMembershipGroupAssignmentsFind"
  try {
    const rows = database
      .query<{ groups_uuid: string }, [string, string]>(
        `SELECT group_user.groups_uuid
         FROM groups_users AS group_user
         INNER JOIN groups AS group_record ON group_record.uuid = group_user.groups_uuid
         WHERE group_user.users_organizations_uuid = ?
           AND group_record.organizations_uuid = ?
         ORDER BY group_user.groups_uuid`,
      )
      .all(membershipUuid, organizationUuid)
    return resultCreate(rows.map((row) => row.groups_uuid))
  } catch {
    return resultErrorCreate(op, "Organization group assignment lookup failed.")
  }
}
