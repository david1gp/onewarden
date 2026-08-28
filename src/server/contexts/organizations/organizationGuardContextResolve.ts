import type { Context } from "hono"
import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import type { AuthenticationOptions } from "../authentication/authenticationOptions.js"
import { authenticationContextResolve } from "../authentication/authenticationContextResolve.js"
import { authenticationGuardErrorCreate } from "../authentication/authenticationGuardErrorCreate.js"
import type { OrganizationGuardContext } from "./organizationGuardContext.js"
import { organizationIdResolve } from "./organizationIdResolve.js"
import { organizationMembershipFindByUserAndOrganization } from "./organizationMembershipFindByUserAndOrganization.js"

export async function organizationGuardContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: AuthenticationOptions,
): Promise<Result<OrganizationGuardContext>> {
  const op = "organizationGuardContextResolve"
  const authenticationResult = await authenticationContextResolve(context, options)
  if (!authenticationResult.success) return authenticationResult
  const organizationUuid = organizationIdResolve(context)
  if (organizationUuid === undefined) return authenticationGuardErrorCreate(op, "Error getting the organization id")

  const database = options.database ?? context.get("database")
  if (database === undefined) return authenticationGuardErrorCreate(op, "Error getting DB")
  const membershipResult = organizationMembershipFindByUserAndOrganization(
    database,
    authenticationResult.data.user.uuid,
    organizationUuid,
  )
  if (!membershipResult.success)
    return authenticationGuardErrorCreate(op, "The current user isn't member of the organization")
  if (membershipResult.data === null)
    return authenticationGuardErrorCreate(op, "The current user isn't member of the organization")
  if (![0, 1, 2, 3].includes(membershipResult.data.type))
    return authenticationGuardErrorCreate(op, "Unknown user type in the database")
  if (
    membershipResult.data.status === -1 ||
    (membershipResult.data.status !== 0 && membershipResult.data.status !== 1 && membershipResult.data.status !== 2)
  )
    return authenticationGuardErrorCreate(op, "User status is either revoked or invalid.")
  return resultCreate({
    authentication: authenticationResult.data,
    membership: membershipResult.data,
    organizationUuid,
  })
}
