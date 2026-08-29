import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationGroup } from "./organizationGroup.js"
import { organizationGroupFromRow } from "./organizationGroupFromRow.js"
import type { OrganizationGroupRow } from "./organizationGroupRow.js"

export function organizationGroupFindByUuidAndOrganization(
  database: DatabaseConnection,
  groupUuid: string,
  organizationUuid: string,
): Result<OrganizationGroup | null> {
  const op = "organizationGroupFindByUuidAndOrganization"
  try {
    const row = database
      .query<OrganizationGroupRow, [string, string]>(
        `SELECT uuid, organizations_uuid, name, access_all, external_id, creation_date, revision_date
         FROM groups
         WHERE uuid = ? AND organizations_uuid = ?
         LIMIT 1`,
      )
      .get(groupUuid, organizationUuid)
    return resultCreate(row === null ? null : organizationGroupFromRow(row))
  } catch {
    return resultErrorCreate(op, "Group lookup failed.")
  }
}
