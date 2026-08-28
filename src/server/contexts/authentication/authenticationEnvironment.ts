import type { AuthenticationContext } from "./authenticationContext.js"
import type { AuthenticationClientVersion } from "./authenticationClientVersionSchema.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationMembership } from "../organizations/organizationMembership.js"

export type AuthenticationEnvironment = {
  Variables: {
    authentication?: AuthenticationContext
    clientVersion?: AuthenticationClientVersion
    database?: DatabaseConnection
    organizationId?: string
    organizationMembership?: OrganizationMembership
  }
}
