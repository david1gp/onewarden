import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { OrganizationPolicy, OrganizationPolicyType } from "./organizationPolicy.js"

export function organizationPolicyCreate(
  organizationUuid: string,
  type: OrganizationPolicyType,
  identifier: Identifier,
  enabled = false,
  data = "null",
  revisionDate = "1970-01-01T00:00:00.000Z",
): OrganizationPolicy {
  return {
    data,
    enabled,
    organizationUuid,
    revisionDate,
    type,
    uuid: identifier.uuid(),
  }
}
