import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationMembership } from "../organizations/organizationMembershipSchema.js"
import type { AuthenticationClientVersion } from "./authenticationClientVersionSchema.js"
import type { AuthenticationContext } from "./authenticationContext.js"

export type AuthenticationEnvironment = {
  Bindings: {
    remoteIpAddress?: string
  }
  Variables: {
    authentication?: AuthenticationContext
    clientVersion?: AuthenticationClientVersion
    database?: DatabaseConnection
    organizationId?: string
    organizationMembership?: OrganizationMembership
  }
}
