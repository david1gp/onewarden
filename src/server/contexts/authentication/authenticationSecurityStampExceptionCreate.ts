import type { Clock } from "../../../shared/clock/clock.js"
import type { IdentityUser } from "../identity/identityUser.js"
import type { AuthenticationSecurityStampException } from "./authenticationSecurityStampExceptionSchema.js"

export function authenticationSecurityStampExceptionCreate(
  user: IdentityUser,
  routes: string[],
  clock: Clock,
): AuthenticationSecurityStampException {
  return {
    expire: Math.floor(clock.now().getTime() / 1_000) + 2 * 60,
    routes,
    security_stamp: user.securityStamp,
  }
}
