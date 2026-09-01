import type { OrganizationPolicy } from "./organizationPolicy.js"
import { organizationPolicyTypeResolve } from "./organizationPolicyTypeResolve.js"
import type { OrganizationPolicyRow } from "../../database/schema/organizationPolicies.js"

export function organizationPolicyFromRow(row: OrganizationPolicyRow): OrganizationPolicy | undefined {
  const type = organizationPolicyTypeResolve(row.atype)
  if (type === undefined) return undefined
  return {
    data: row.data,
    enabled: row.enabled,
    organizationUuid: row.orgUuid,
    revisionDate: row.revisionDate,
    type,
    uuid: row.uuid,
  }
}
