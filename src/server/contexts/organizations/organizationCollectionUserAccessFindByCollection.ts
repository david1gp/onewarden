import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationCollectionUserAccessFindByCollection(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
): Result<
  {
    hidePasswords: boolean
    manage: boolean
    membershipType: number
    membershipUuid: string
    readOnly: boolean
  }[]
> {
  const op = "organizationCollectionUserAccessFindByCollection"
  try {
    const rows = database
      .query<OrganizationCollectionUserAccessRow, [string, string]>(
        `SELECT uo.uuid AS membership_uuid, uo.atype AS membership_type,
                uc.read_only, uc.hide_passwords, uc.manage
         FROM users_collections AS uc
         JOIN users_organizations AS uo
           ON uo.user_uuid = uc.user_uuid AND uo.org_uuid = ?
         WHERE uc.collection_uuid = ?
         ORDER BY uo.uuid`,
      )
      .all(organizationUuid, collectionUuid)
    return resultCreate(
      rows.map((row) => ({
        hidePasswords: row.hide_passwords === 1,
        manage: row.manage === 1,
        membershipType: row.membership_type,
        membershipUuid: row.membership_uuid,
        readOnly: row.read_only === 1,
      })),
    )
  } catch {
    return resultErrorCreate(op, "Collection user access lookup failed.")
  }
}

type OrganizationCollectionUserAccessRow = {
  hide_passwords: number
  manage: number
  membership_type: number
  membership_uuid: string
  read_only: number
}
