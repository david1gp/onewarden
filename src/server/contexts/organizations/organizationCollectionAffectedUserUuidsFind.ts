import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationCollectionAffectedUserUuidsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
): Result<string[]> {
  const op = "organizationCollectionAffectedUserUuidsFind"
  try {
    const rows = database
      .query<{ user_uuid: string }, [string, string, string]>(
        `SELECT DISTINCT uo.user_uuid
         FROM users_organizations AS uo
         LEFT JOIN users_collections AS uc
           ON uc.user_uuid = uo.user_uuid AND uc.collection_uuid = ?
         LEFT JOIN groups_users AS gu
           ON gu.users_organizations_uuid = uo.uuid
         LEFT JOIN groups AS g
           ON g.uuid = gu.groups_uuid AND g.organizations_uuid = uo.org_uuid
         LEFT JOIN collections_groups AS cg
           ON cg.groups_uuid = g.uuid AND cg.collections_uuid = ?
         WHERE uo.org_uuid = ?
           AND (
             uo.access_all = 1
             OR uo.atype <= 1
             OR uc.user_uuid IS NOT NULL
             OR g.access_all = 1
             OR cg.collections_uuid IS NOT NULL
           )
         ORDER BY uo.user_uuid`,
      )
      .all(collectionUuid, collectionUuid, organizationUuid)
    return resultCreate(rows.map((row) => row.user_uuid))
  } catch {
    return resultErrorCreate(op, "Collection access revision lookup failed.")
  }
}
