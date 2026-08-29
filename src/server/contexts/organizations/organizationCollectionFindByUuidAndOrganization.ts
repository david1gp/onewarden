import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionFromRow } from "./organizationCollectionFromRow.js"
import type { OrganizationCollectionRow } from "./organizationCollectionRow.js"

export function organizationCollectionFindByUuidAndOrganization(
  database: DatabaseConnection,
  collectionUuid: string,
  organizationUuid: string,
): Result<OrganizationCollection | null> {
  const op = "organizationCollectionFindByUuidAndOrganization"
  try {
    const row = database
      .query<OrganizationCollectionRow, [string, string]>(
        `SELECT uuid, org_uuid, name, external_id
         FROM collections
         WHERE uuid = ? AND org_uuid = ?
         LIMIT 1`,
      )
      .get(collectionUuid, organizationUuid)
    return resultCreate(row === null ? null : organizationCollectionFromRow(row))
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
