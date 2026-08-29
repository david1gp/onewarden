import type { OrganizationPolicy } from "./organizationPolicy.js"
import { organizationPolicyTypeResolve } from "./organizationPolicyTypeResolve.js"
import type { OrganizationPolicyRow } from "./organizationPolicyRow.js"

export function organizationPolicyFromRow(row: OrganizationPolicyRow): OrganizationPolicy | undefined {
  const type = organizationPolicyTypeResolve(row.atype)
  if (type === undefined) return undefined
  return {
    data: row.data,
    enabled: row.enabled === true || row.enabled === 1,
    organizationUuid: row.org_uuid,
    revisionDate: row.revision_date,
    type,
    uuid: row.uuid,
  }
}
