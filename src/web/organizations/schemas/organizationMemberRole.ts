export const organizationMemberRole = {
  owner: 0,
  admin: 1,
  user: 2,
  manager: 3,
  custom: 4,
} as const

export type OrganizationMemberRole = (typeof organizationMemberRole)[keyof typeof organizationMemberRole]
