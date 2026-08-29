import { organizationPolicyType } from "./organizationPolicyType.js"

export type OrganizationPolicy = {
  uuid: string
  organizationUuid: string
  type: OrganizationPolicyType
  enabled: boolean
  data: string
  revisionDate: string
}

export type OrganizationPolicyType = (typeof organizationPolicyType)[keyof typeof organizationPolicyType]
