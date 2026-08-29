import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionFromRow } from "./organizationCollectionFromRow.js"
import type { OrganizationCollectionRow } from "./organizationCollectionRow.js"

export function organizationCollectionFindByUser(
  database: DatabaseConnection,
  userUuid: string,
  groupsEnabled = false,
): Result<OrganizationCollection[]> {
  const op = "organizationCollectionFindByUser"
  try {
    if (!groupsEnabled) {
      const rows = database
        .query<OrganizationCollectionRow, [string, string]>(
          `SELECT DISTINCT c.uuid, c.org_uuid, c.name, c.external_id
           FROM collections AS c
           JOIN users_organizations AS uo
             ON uo.org_uuid = c.org_uuid AND uo.user_uuid = ?
           LEFT JOIN users_collections AS uc
             ON uc.collection_uuid = c.uuid AND uc.user_uuid = ?
           WHERE uo.status = 2
             AND (uc.user_uuid IS NOT NULL OR uo.access_all = 1 OR uo.atype <= 1)`,
        )
        .all(userUuid, userUuid)
      return resultCreate(rows.map(organizationCollectionFromRow))
    }

    const rows = database
      .query<OrganizationCollectionRow, [string, string]>(
        `SELECT DISTINCT c.uuid, c.org_uuid, c.name, c.external_id
         FROM collections AS c
         JOIN users_organizations AS uo
           ON uo.org_uuid = c.org_uuid AND uo.user_uuid = ?
         LEFT JOIN users_collections AS uc
           ON uc.collection_uuid = c.uuid AND uc.user_uuid = ?
         LEFT JOIN groups_users AS gu
           ON gu.users_organizations_uuid = uo.uuid
         LEFT JOIN groups AS g
           ON g.uuid = gu.groups_uuid AND g.organizations_uuid = c.org_uuid
         LEFT JOIN collections_groups AS cg
           ON cg.groups_uuid = g.uuid AND cg.collections_uuid = c.uuid
         WHERE uo.status = 2
           AND (
             uc.user_uuid IS NOT NULL
             OR uo.access_all = 1
             OR uo.atype <= 1
             OR g.access_all = 1
             OR cg.collections_uuid IS NOT NULL
           )`,
      )
      .all(userUuid, userUuid)
    return resultCreate(rows.map(organizationCollectionFromRow))
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
