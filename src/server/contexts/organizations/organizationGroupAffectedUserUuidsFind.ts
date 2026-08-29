import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationGroupAffectedUserUuidsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  groupUuid: string,
): Result<string[]> {
  const op = "organizationGroupAffectedUserUuidsFind"
  try {
    const rows = database
      .query<{ user_uuid: string }, [string, string]>(
        `SELECT DISTINCT uo.user_uuid
         FROM groups_users AS gu
         JOIN groups AS g
           ON g.uuid = gu.groups_uuid AND g.organizations_uuid = ?
         JOIN users_organizations AS uo
           ON uo.uuid = gu.users_organizations_uuid AND uo.org_uuid = g.organizations_uuid
         WHERE gu.groups_uuid = ?
         ORDER BY uo.user_uuid`,
      )
      .all(organizationUuid, groupUuid)
    return resultCreate(rows.map((row) => row.user_uuid))
  } catch {
    return resultErrorCreate(op, "Group member revision lookup failed.")
  }
}
