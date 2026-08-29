import type { OrganizationSsoConfig } from "./organizationSsoConfig.js"
import type { OrganizationSsoConfigRow } from "./organizationSsoConfigRow.js"

export function organizationSsoConfigFromRow(row: OrganizationSsoConfigRow): OrganizationSsoConfig {
  return {
    creationDate: row.creation_date,
    data: row.data,
    enabled: row.enabled === true || row.enabled === 1,
    organizationUuid: row.org_uuid,
    revisionDate: row.revision_date,
  }
}
