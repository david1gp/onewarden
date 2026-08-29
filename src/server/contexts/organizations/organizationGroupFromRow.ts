import type { OrganizationGroup } from "./organizationGroup.js"
import type { OrganizationGroupRow } from "./organizationGroupRow.js"

export function organizationGroupFromRow(row: OrganizationGroupRow): OrganizationGroup {
  return {
    accessAll: row.access_all === 1,
    createdAt: row.creation_date,
    externalId: row.external_id,
    name: row.name,
    organizationUuid: row.organizations_uuid,
    revisionDate: row.revision_date,
    uuid: row.uuid,
  }
}
