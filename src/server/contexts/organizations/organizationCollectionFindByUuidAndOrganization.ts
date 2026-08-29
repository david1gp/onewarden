import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionSelect } from "./organizationCollectionSelect.js"

export function organizationCollectionFindByUuidAndOrganization(
  database: DatabaseConnection,
  collectionUuid: string,
  organizationUuid: string,
): Result<OrganizationCollection | null> {
  const op = "organizationCollectionFindByUuidAndOrganization"
  try {
    const row = database
      .query<OrganizationCollection, [string, string]>(
        `SELECT ${organizationCollectionSelect}
         FROM collections AS c
         WHERE c.uuid = ? AND c.org_uuid = ?
         LIMIT 1`,
      )
      .get(collectionUuid, organizationUuid)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
