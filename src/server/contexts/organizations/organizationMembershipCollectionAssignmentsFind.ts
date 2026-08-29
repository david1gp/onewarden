import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationMembershipCollectionAssignmentsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
  groupsEnabled: boolean,
): Result<Array<{ hidePasswords: boolean; id: string; manage: boolean; readOnly: boolean }>> {
  const op = "organizationMembershipCollectionAssignmentsFind"
  try {
    const rows = database
      .query<
        { collection_uuid: string; hide_passwords: number; manage: number; read_only: number },
        [number, string, string, string, string]
      >(
        `SELECT uc.collection_uuid, uc.read_only, uc.hide_passwords, uc.manage
         FROM users_collections AS uc
         INNER JOIN collections AS collection ON collection.uuid = uc.collection_uuid
         WHERE (? = 0 OR NOT EXISTS (
              SELECT 1
              FROM groups_users AS group_user
              INNER JOIN groups AS group_record ON group_record.uuid = group_user.groups_uuid
              WHERE group_user.users_organizations_uuid = ?
                AND group_record.organizations_uuid = collection.org_uuid
                AND group_record.access_all = 1
            ))
           AND uc.user_uuid = (SELECT user_uuid FROM users_organizations WHERE uuid = ? AND org_uuid = ?)
           AND collection.org_uuid = ?
         ORDER BY uc.collection_uuid`,
      )
      .all(groupsEnabled ? 1 : 0, membershipUuid, membershipUuid, organizationUuid, organizationUuid)
    return resultCreate(
      rows.map((row) => ({
        hidePasswords: row.hide_passwords === 1,
        id: row.collection_uuid,
        manage: row.manage === 1,
        readOnly: row.read_only === 1,
      })),
    )
  } catch {
    return resultErrorCreate(op, "Organization collection assignment lookup failed.")
  }
}
