export const organizationMemberStatus = {
  invited: 0,
  accepted: 1,
  confirmed: 2,
  revoked: -1,
} as const

export type OrganizationMemberStatus = (typeof organizationMemberStatus)[keyof typeof organizationMemberStatus]
