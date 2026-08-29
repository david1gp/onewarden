import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollectionGroupAccess } from "./organizationCollectionGroupAccess.js"

export function organizationCollectionGroupAccessFindByCollection(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
): Result<OrganizationCollectionGroupAccess[]> {
  const op = "organizationCollectionGroupAccessFindByCollection"
  try {
    const rows = database
      .query<OrganizationCollectionGroupAccessRow, [string, string]>(
        `SELECT cg.groups_uuid AS group_uuid, cg.read_only, cg.hide_passwords, cg.manage
         FROM collections_groups AS cg
         JOIN collections AS c
           ON c.uuid = cg.collections_uuid AND c.org_uuid = ?
         JOIN groups AS g
           ON g.uuid = cg.groups_uuid AND g.organizations_uuid = c.org_uuid
         WHERE cg.collections_uuid = ?
         ORDER BY cg.groups_uuid`,
      )
      .all(organizationUuid, collectionUuid)
    return resultCreate(
      rows.map((row) => ({
        groupUuid: row.group_uuid,
        hidePasswords: row.hide_passwords === 1,
        manage: row.manage === 1,
        readOnly: row.read_only === 1,
      })),
    )
  } catch {
    return resultErrorCreate(op, "Collection group access lookup failed.")
  }
}

type OrganizationCollectionGroupAccessRow = {
  group_uuid: string
  hide_passwords: number
  manage: number
  read_only: number
}
