import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionFromRow } from "./organizationCollectionFromRow.js"
import type { OrganizationCollectionRow } from "./organizationCollectionRow.js"

export function organizationCollectionFindByUuidAndUser(
  database: DatabaseConnection,
  collectionUuid: string,
  userUuid: string,
  groupsEnabled = false,
): Result<OrganizationCollection | null> {
  const op = "organizationCollectionFindByUuidAndUser"
  try {
    const groupSql = groupsEnabled
      ? `
         LEFT JOIN groups_users AS gu
           ON gu.users_organizations_uuid = uo.uuid
         LEFT JOIN groups AS g
           ON g.uuid = gu.groups_uuid AND g.organizations_uuid = c.org_uuid
         LEFT JOIN collections_groups AS cg
           ON cg.groups_uuid = g.uuid AND cg.collections_uuid = c.uuid`
      : ""
    const groupAccessSql = groupsEnabled ? " OR g.access_all = 1 OR cg.collections_uuid IS NOT NULL" : ""
    const row = database
      .query<OrganizationCollectionRow, [string, string, string]>(
        `SELECT DISTINCT c.uuid, c.org_uuid, c.name, c.external_id
         FROM collections AS c
         JOIN users_organizations AS uo
           ON uo.org_uuid = c.org_uuid AND uo.user_uuid = ?
         LEFT JOIN users_collections AS uc
           ON uc.collection_uuid = c.uuid AND uc.user_uuid = ?${groupSql}
         WHERE c.uuid = ?
           AND uo.status = 2
           AND (
             uc.collection_uuid = c.uuid
             OR uo.access_all = 1
             OR uo.atype <= 1${groupAccessSql}
           )
         LIMIT 1`,
      )
      .get(userUuid, userUuid, collectionUuid)
    return resultCreate(row === null ? null : organizationCollectionFromRow(row))
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
