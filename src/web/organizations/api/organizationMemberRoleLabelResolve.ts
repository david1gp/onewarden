import { organizationMemberRole, type OrganizationMemberRole } from "../schemas/organizationMemberRole.js"

export function organizationMemberRoleLabelResolve(role: number | OrganizationMemberRole): string {
  if (role === organizationMemberRole.owner) return "Owner"
  if (role === organizationMemberRole.admin) return "Admin"
  if (role === organizationMemberRole.manager) return "Manager"
  if (role === organizationMemberRole.custom) return "Custom"
  return "User"
}
