import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationGroupMemberMembershipUuidsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  groupUuid: string,
): Result<string[]> {
  const op = "organizationGroupMemberMembershipUuidsFind"
  try {
    const rows = database
      .query<{ membership_uuid: string }, [string, string]>(
        `SELECT gu.users_organizations_uuid AS membership_uuid
         FROM groups_users AS gu
         JOIN groups AS g
           ON g.uuid = gu.groups_uuid AND g.organizations_uuid = ?
         JOIN users_organizations AS uo
           ON uo.uuid = gu.users_organizations_uuid AND uo.org_uuid = g.organizations_uuid
         WHERE gu.groups_uuid = ?
         ORDER BY gu.users_organizations_uuid`,
      )
      .all(organizationUuid, groupUuid)
    return resultCreate(rows.map((row) => row.membership_uuid))
  } catch {
    return resultErrorCreate(op, "Group member lookup failed.")
  }
}
