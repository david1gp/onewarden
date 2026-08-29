import type { OrganizationPolicy } from "./organizationPolicy.js"
import { organizationPolicyType } from "./organizationPolicyType.js"

export function organizationPolicyToJson(policy: OrganizationPolicy): Record<string, unknown> {
  const data = organizationPolicyDataParse(policy.data)
  const json = {
    id: policy.uuid,
    organizationId: policy.organizationUuid,
    type: policy.type,
    data,
    enabled: policy.enabled,
    revisionDate: policy.revisionDate,
    object: "policy",
  }
  if (policy.type !== organizationPolicyType.resetPassword) return json
  return { ...json, canToggleState: true }
}

function organizationPolicyDataParse(data: string): unknown {
  try {
    return JSON.parse(data) as unknown
  } catch {
    return null
  }
}
