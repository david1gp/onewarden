import type { OrganizationCollection } from "./organizationCollection.js"
import type { OrganizationCollectionRow } from "./organizationCollectionRow.js"

export function organizationCollectionFromRow(row: OrganizationCollectionRow): OrganizationCollection {
  return {
    externalId: row.external_id,
    name: row.name,
    organizationUuid: row.org_uuid,
    uuid: row.uuid,
  }
}
