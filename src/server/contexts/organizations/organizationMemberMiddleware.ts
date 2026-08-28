import type { MiddlewareHandler } from "hono"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import type { AuthenticationOptions } from "../authentication/authenticationOptions.js"
import { authenticationGuardErrorCreate } from "../authentication/authenticationGuardErrorCreate.js"
import { organizationGuardContextResolve } from "./organizationGuardContextResolve.js"
import { organizationMembershipRoleCheck } from "./organizationMembershipRoleCheck.js"

export function organizationMemberMiddleware(
  options: AuthenticationOptions = {},
): MiddlewareHandler<AuthenticationEnvironment> {
  return async (context, next) => {
    const guardResult = await organizationGuardContextResolve(context, options)
    if (!guardResult.success) return apiErrorResponseCreate(guardResult)
    if (!organizationMembershipRoleCheck(guardResult.data.membership, "member"))
      return apiErrorResponseCreate(
        authenticationGuardErrorCreate(
          "organizationMemberMiddleware",
          "You need to be a Member of the Organization to call this endpoint",
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
