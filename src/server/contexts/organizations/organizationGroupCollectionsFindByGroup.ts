import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollectionAccessData } from "./organizationCollectionAccessDataSchema.js"

export function organizationGroupCollectionsFindByGroup(
  database: DatabaseConnection,
  groupUuid: string,
  organizationUuid: string,
): Result<OrganizationCollectionAccessData[]> {
  const op = "organizationGroupCollectionsFindByGroup"
  try {
    const rows = database
      .query<OrganizationGroupCollectionRow, [string, string]>(
        `SELECT cg.collections_uuid AS collection_uuid,
                cg.read_only, cg.hide_passwords, cg.manage
         FROM collections_groups AS cg
         JOIN groups AS g
           ON g.uuid = cg.groups_uuid AND g.organizations_uuid = ?
         JOIN collections AS c
           ON c.uuid = cg.collections_uuid AND c.org_uuid = g.organizations_uuid
         WHERE cg.groups_uuid = ?
         ORDER BY cg.collections_uuid`,
      )
      .all(organizationUuid, groupUuid)
    return resultCreate(
      rows.map((row) => ({
        hidePasswords: row.hide_passwords === 1,
        id: row.collection_uuid,
        manage: row.manage === 1,
        readOnly: row.read_only === 1,
      })),
    )
  } catch {
    return resultErrorCreate(op, "Group collection access lookup failed.")
  }
}

type OrganizationGroupCollectionRow = {
  collection_uuid: string
  hide_passwords: number
  manage: number
  read_only: number
}
