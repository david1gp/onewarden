import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationCollectionManageableByUser(
  database: DatabaseConnection,
  collectionUuid: string,
  userUuid: string,
  organizationUuid: string,
  groupsEnabled = false,
): Result<boolean> {
  const op = "organizationCollectionManageableByUser"
  try {
    const row = database
      .query<{ manageable: number }, [string, string, string, string, number]>(
        `SELECT CASE WHEN EXISTS (
           SELECT 1
           FROM collections AS c
           LEFT JOIN users_collections AS uc
             ON uc.collection_uuid = c.uuid AND uc.user_uuid = ?
           LEFT JOIN users_organizations AS uo
             ON uo.org_uuid = c.org_uuid AND uo.user_uuid = ?
           LEFT JOIN groups_users AS gu
             ON gu.users_organizations_uuid = uo.uuid
           LEFT JOIN groups AS g
             ON g.uuid = gu.groups_uuid AND g.organizations_uuid = c.org_uuid
           LEFT JOIN collections_groups AS cg
             ON cg.groups_uuid = g.uuid AND cg.collections_uuid = c.uuid
           WHERE c.uuid = ? AND c.org_uuid = ? AND (
             (uc.collection_uuid = c.uuid AND uc.manage = 1)
             OR uo.access_all = 1
             OR uo.atype <= 1
             OR (? = 1 AND (g.access_all = 1 OR (cg.collections_uuid = c.uuid AND cg.manage = 1)))
           )
         ) THEN 1 ELSE 0 END AS manageable`,
      )
      .get(userUuid, userUuid, collectionUuid, organizationUuid, groupsEnabled ? 1 : 0)
    if (row === null) return resultCreate(false)
    return resultCreate(row.manageable === 1)
  } catch {
    return resultErrorCreate(op, "Collection manageability lookup failed.")
  }
}
