import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationCollectionWritableByUser(
  database: DatabaseConnection,
  collectionUuid: string,
  userUuid: string,
  organizationUuid: string,
  groupsEnabled = false,
  confirmedOnly = true,
): Result<boolean> {
  const op = "organizationCollectionWritableByUser"
  try {
    const row = database
      .query<{ writable: number }, [string, number, string, string, string, number]>(
        `SELECT CASE WHEN EXISTS (
           SELECT 1
           FROM collections AS c
           JOIN users_organizations AS uo
             ON uo.org_uuid = c.org_uuid AND uo.user_uuid = ? AND (? = 0 OR uo.status = 2)
           LEFT JOIN users_collections AS uc
             ON uc.collection_uuid = c.uuid AND uc.user_uuid = ?
           WHERE c.uuid = ? AND c.org_uuid = ? AND (
             uo.access_all = 1
             OR uo.atype <= 1
             OR (uc.collection_uuid IS NOT NULL AND uc.read_only = 0)
             OR (
               ? = 1
               AND EXISTS (
                 SELECT 1
                 FROM groups_users AS gu
                 JOIN groups AS g ON g.uuid = gu.groups_uuid AND g.organizations_uuid = c.org_uuid
                 LEFT JOIN collections_groups AS cg
                   ON cg.groups_uuid = g.uuid AND cg.collections_uuid = c.uuid
                 WHERE gu.users_organizations_uuid = uo.uuid
                   AND (g.access_all = 1 OR (cg.collections_uuid IS NOT NULL AND cg.read_only = 0))
               )
             )
           )
         ) THEN 1 ELSE 0 END AS writable`,
      )
      .get(userUuid, confirmedOnly ? 1 : 0, userUuid, collectionUuid, organizationUuid, groupsEnabled ? 1 : 0)
    return resultCreate(row?.writable === 1)
  } catch {
    return resultErrorCreate(op, "Collection write access lookup failed.")
  }
}
