import type { MiddlewareHandler } from "hono"
import type { AuthenticationEnvironment } from "./contexts/authentication/authenticationEnvironment.js"
import { responseSecurityHeadersApply } from "./responseSecurityHeadersApply.js"

export function securityHeadersMiddleware(): MiddlewareHandler<AuthenticationEnvironment> {
  return async (context, next) => {
    await next()
    responseSecurityHeadersApply(context.res, { spaDocument: context.get("securityHeadersSpaDocument") === true })
  }
}
