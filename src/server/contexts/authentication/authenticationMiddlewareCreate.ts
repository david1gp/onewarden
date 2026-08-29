import type { MiddlewareHandler } from "hono"
import type { AuthenticationEnvironment } from "./authenticationEnvironment.js"
import { authenticationMiddleware } from "./authenticationMiddleware.js"
import type { AuthenticationOptions } from "./authenticationOptions.js"

export function authenticationMiddlewareCreate(
  options: Omit<AuthenticationOptions, "routeName">,
): (routeName: string) => MiddlewareHandler<AuthenticationEnvironment> {
  return (routeName) => authenticationMiddleware({ ...options, routeName })
}
