import type { MiddlewareHandler } from "hono"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import type { AuthenticationEnvironment } from "./authenticationEnvironment.js"
import type { AuthenticationOptions } from "./authenticationOptions.js"
import { authenticationContextResolve } from "./authenticationContextResolve.js"

export function authenticationMiddleware(
  options: AuthenticationOptions = {},
): MiddlewareHandler<AuthenticationEnvironment> {
  return async (context, next) => {
    const result = await authenticationContextResolve(context, options)
    if (!result.success) return apiErrorResponseCreate(result)
    context.set("authentication", result.data)
    return next()
  }
}
