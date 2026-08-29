import type { BadgeVariant } from "#ui/static/badge/badgeCva.jsx"
import { organizationMemberStatus, type OrganizationMemberStatus } from "../schemas/organizationMemberStatus.js"

export function organizationMemberStatusLabelResolve(status: number | OrganizationMemberStatus): {
  label: string
  variant: BadgeVariant
} {
  if (status === organizationMemberStatus.confirmed) {
    return { label: "Confirmed", variant: "filledGreen" }
  }
  if (status === organizationMemberStatus.accepted) {
    return { label: "Accepted", variant: "filledBlue" }
  }
  if (status === organizationMemberStatus.invited) {
    return { label: "Invited", variant: "filledYellow" }
  }
  if (status === organizationMemberStatus.revoked) {
    return { label: "Revoked", variant: "filledRed" }
  }
  return { label: "Unknown", variant: "subtle" }
}
