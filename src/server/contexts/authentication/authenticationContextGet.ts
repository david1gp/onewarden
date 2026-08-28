import type { Context } from "hono"
import type { AuthenticationContext } from "./authenticationContext.js"
import type { AuthenticationEnvironment } from "./authenticationEnvironment.js"

export function authenticationContextGet(
  context: Context<AuthenticationEnvironment>,
): AuthenticationContext | undefined {
  return context.get("authentication")
}
