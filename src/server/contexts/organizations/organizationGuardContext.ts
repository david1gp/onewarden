import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"

export type OrganizationGuardContext = {
  authentication: AuthenticationContext
  membership: OrganizationMembership
  organizationUuid: string
}
