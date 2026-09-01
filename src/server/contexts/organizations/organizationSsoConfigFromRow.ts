import type { OrganizationSsoConfig } from "./organizationSsoConfig.js"
import type { OrganizationSsoConfigRow } from "../../database/schema/organizationSsoConfigs.js"

export function organizationSsoConfigFromRow(row: OrganizationSsoConfigRow): OrganizationSsoConfig {
  return {
    creationDate: row.creationDate,
    data: row.data,
    enabled: row.enabled,
    organizationUuid: row.orgUuid,
    revisionDate: row.revisionDate,
  }
}
