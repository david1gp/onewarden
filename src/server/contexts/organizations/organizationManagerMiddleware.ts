import type { MiddlewareHandler } from "hono"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import type { AuthenticationOptions } from "../authentication/authenticationOptions.js"
import { authenticationGuardErrorCreate } from "../authentication/authenticationGuardErrorCreate.js"
import { organizationGuardContextResolve } from "./organizationGuardContextResolve.js"
import { collectionIdResolve } from "./collectionIdResolve.js"
import { organizationCollectionManageableByUser } from "./organizationCollectionManageableByUser.js"
import { organizationMembershipRoleCheck } from "./organizationMembershipRoleCheck.js"

export function organizationManagerMiddleware(
  options: AuthenticationOptions = {},
): MiddlewareHandler<AuthenticationEnvironment> {
  return async (context, next) => {
    const guardResult = await organizationGuardContextResolve(context, options)
    if (!guardResult.success) return apiErrorResponseCreate(guardResult)
    if (!organizationMembershipRoleCheck(guardResult.data.membership, "manager"))
      return apiErrorResponseCreate(
        authenticationGuardErrorCreate(
          "organizationManagerMiddleware",
          "You need to be a Manager, Admin or Owner to call this endpoint",
        ),
      )
    const collectionUuid = collectionIdResolve(context)
    if (collectionUuid === undefined)
      return apiErrorResponseCreate(
        authenticationGuardErrorCreate("organizationManagerMiddleware", "Error getting the collection id"),
      )
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(authenticationGuardErrorCreate("organizationManagerMiddleware", "Error getting DB"))
    const manageableResult = organizationCollectionManageableByUser(
      database,
      collectionUuid,
      guardResult.data.authentication.user.uuid,
      guardResult.data.organizationUuid,
      options.groupsEnabled,
    )
    if (!manageableResult.success || !manageableResult.data)
      return apiErrorResponseCreate(
        authenticationGuardErrorCreate(
          "organizationManagerMiddleware",
          "The current user isn't a manager for this collection",
        ),
      )
    organizationGuardContextSet(context, guardResult.data)
    return next()
  }
}

function organizationGuardContextSet(
  context: import("hono").Context<AuthenticationEnvironment>,
  guard: import("./organizationGuardContext.js").OrganizationGuardContext,
): void {
  context.set("authentication", guard.authentication)
  context.set("organizationId", guard.organizationUuid)
  context.set("organizationMembership", guard.membership)
}
