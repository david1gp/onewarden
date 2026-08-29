import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionFromRow } from "./organizationCollectionFromRow.js"
import type { OrganizationCollectionRow } from "./organizationCollectionRow.js"

export function organizationCollectionFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationCollection[]> {
  const op = "organizationCollectionFindByOrganization"
  try {
    const rows = database
      .query<OrganizationCollectionRow, [string]>(
        "SELECT uuid, org_uuid, name, external_id FROM collections WHERE org_uuid = ?",
      )
      .all(organizationUuid)
    return resultCreate(rows.map(organizationCollectionFromRow))
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
