import type { MiddlewareHandler } from "hono"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import type { AuthenticationEnvironment } from "./authenticationEnvironment.js"
import { authenticationClientVersionParse } from "./authenticationClientVersionParse.js"

export function authenticationClientVersionMiddleware(): MiddlewareHandler<AuthenticationEnvironment> {
  return async (context, next) => {
    const result = authenticationClientVersionParse(context.req.header("Bitwarden-Client-Version"))
    if (!result.success) return apiErrorResponseCreate(result)
    context.set("clientVersion", result.data)
    return next()
  }
}
