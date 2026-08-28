import type { Clock } from "../../../shared/clock/clock.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { authenticationSecurityStampExceptionCreate } from "./authenticationSecurityStampExceptionCreate.js"

export function authenticationSecurityStampExceptionSet(user: IdentityUser, routes: string[], clock: Clock): void {
  user.stampException = JSON.stringify(authenticationSecurityStampExceptionCreate(user, routes, clock))
}
