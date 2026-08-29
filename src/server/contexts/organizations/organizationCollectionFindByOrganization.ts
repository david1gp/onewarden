import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionSelect } from "./organizationCollectionSelect.js"

export function organizationCollectionFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationCollection[]> {
  const op = "organizationCollectionFindByOrganization"
  try {
    const rows = database
      .query<OrganizationCollection, [string]>(
        `SELECT ${organizationCollectionSelect} FROM collections AS c WHERE c.org_uuid = ?`,
      )
      .all(organizationUuid)
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
