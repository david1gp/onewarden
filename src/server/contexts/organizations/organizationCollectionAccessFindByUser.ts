import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationCollectionAccessFindByUser(
  database: DatabaseConnection,
  collectionUuid: string,
  userUuid: string,
  groupsEnabled = false,
): Result<{ hidePasswords: boolean; manage: boolean; readOnly: boolean } | null> {
  const op = "organizationCollectionAccessFindByUser"
  try {
    const row = database
      .query<OrganizationCollectionAccessRow, [string, string]>(
        `SELECT read_only, hide_passwords, manage
         FROM users_collections
         WHERE collection_uuid = ? AND user_uuid = ?
         LIMIT 1`,
      )
      .get(collectionUuid, userUuid)
    if (row !== null)
      return resultCreate({
        hidePasswords: row.hide_passwords === 1,
        manage: row.manage === 1,
        readOnly: row.read_only === 1,
      })
    if (!groupsEnabled) return resultCreate(null)
    const groupRow = database
      .query<OrganizationCollectionGroupAccessRow, [string, string, string]>(
        `SELECT cg.read_only, cg.hide_passwords, cg.manage, g.access_all
         FROM collections AS c
         JOIN users_organizations AS uo
           ON uo.org_uuid = c.org_uuid AND uo.user_uuid = ?
         JOIN groups_users AS gu ON gu.users_organizations_uuid = uo.uuid
         JOIN groups AS g ON g.uuid = gu.groups_uuid AND g.organizations_uuid = uo.org_uuid
         LEFT JOIN collections_groups AS cg
           ON cg.groups_uuid = g.uuid AND cg.collections_uuid = ?
         WHERE c.uuid = ? AND (g.access_all = 1 OR cg.collections_uuid IS NOT NULL)
         ORDER BY g.access_all DESC, g.uuid
         LIMIT 1`,
      )
      .get(userUuid, collectionUuid, collectionUuid)
    return resultCreate(
      groupRow === null
        ? null
        : {
            hidePasswords: groupRow.access_all === 1 ? false : groupRow.hide_passwords === 1,
            manage: groupRow.access_all === 1 ? false : groupRow.manage === 1,
            readOnly: groupRow.access_all === 1 ? false : groupRow.read_only === 1,
          },
    )
  } catch {
    return resultErrorCreate(op, "Collection user access lookup failed.")
  }
}

type OrganizationCollectionAccessRow = {
  hide_passwords: number
  manage: number
  read_only: number
}

type OrganizationCollectionGroupAccessRow = OrganizationCollectionAccessRow & { access_all: number }
