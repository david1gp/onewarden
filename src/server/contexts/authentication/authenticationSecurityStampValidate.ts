import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityUserSave } from "../identity/identityUserSave.js"
import { authenticationGuardErrorCreate } from "./authenticationGuardErrorCreate.js"
import { authenticationSecurityStampExceptionParse } from "./authenticationSecurityStampExceptionParse.js"

export function authenticationSecurityStampValidate(
  user: IdentityUser,
  tokenSecurityStamp: string,
  currentRoute: string | undefined,
  database: DatabaseConnection,
  clock: Clock,
): Result<void> {
  const op = "authenticationSecurityStampValidate"
  if (user.securityStamp === tokenSecurityStamp) return resultCreate(undefined)

  const exceptionResult = authenticationSecurityStampExceptionParse(user.stampException)
  if (!exceptionResult.success) return authenticationGuardErrorCreate(op, "Invalid security stamp")
  const exception = exceptionResult.data
  if (currentRoute === undefined)
    return authenticationGuardErrorCreate(op, "Error getting current route for stamp exception")

  if (Math.floor(clock.now().getTime() / 1_000) > exception.expire) {
    user.stampException = null
    void identityUserSave(database, user)
    return authenticationGuardErrorCreate(op, "Stamp exception is expired")
  }
  if (!exception.routes.includes(currentRoute))
    return authenticationGuardErrorCreate(op, "Invalid security stamp: Current route and exception route do not match")
  if (exception.security_stamp !== tokenSecurityStamp)
    return authenticationGuardErrorCreate(op, "Invalid security stamp for matched stamp exception")
  return resultCreate(undefined)
}
