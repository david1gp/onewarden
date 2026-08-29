import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationGroupFullAccessByMember(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
): Result<boolean> {
  const op = "organizationGroupFullAccessByMember"
  try {
    const row = database
      .query<{ access_all: number }, [string, string]>(
        `SELECT g.access_all
         FROM groups_users AS gu
         JOIN groups AS g
           ON g.uuid = gu.groups_uuid AND g.organizations_uuid = ?
         WHERE gu.users_organizations_uuid = ? AND g.access_all = 1
         LIMIT 1`,
      )
      .get(organizationUuid, membershipUuid)
    return resultCreate(row !== null && row.access_all === 1)
  } catch {
    return resultErrorCreate(op, "Group access lookup failed.")
  }
}
