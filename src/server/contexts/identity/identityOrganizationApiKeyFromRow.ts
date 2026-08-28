import type { IdentityOrganizationApiKey } from "./identityOrganizationApiKey.js"
import type { IdentityOrganizationApiKeyRow } from "./identityOrganizationApiKeyRow.js"

export function identityOrganizationApiKeyFromRow(row: IdentityOrganizationApiKeyRow): IdentityOrganizationApiKey {
  return {
    uuid: row.uuid,
    organizationUuid: row.org_uuid,
    type: row.atype,
    apiKey: row.api_key,
    revisionDate: row.revision_date,
  }
}
