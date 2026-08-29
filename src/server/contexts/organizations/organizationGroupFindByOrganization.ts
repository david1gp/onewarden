import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationGroup } from "./organizationGroup.js"
import { organizationGroupFromRow } from "./organizationGroupFromRow.js"
import type { OrganizationGroupRow } from "./organizationGroupRow.js"

export function organizationGroupFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationGroup[]> {
  const op = "organizationGroupFindByOrganization"
  try {
    const rows = database
      .query<OrganizationGroupRow, [string]>(
        `SELECT uuid, organizations_uuid, name, access_all, external_id, creation_date, revision_date
         FROM groups
         WHERE organizations_uuid = ?
         ORDER BY uuid`,
      )
      .all(organizationUuid)
    return resultCreate(rows.map(organizationGroupFromRow))
  } catch {
    return resultErrorCreate(op, "Group lookup failed.")
  }
}
