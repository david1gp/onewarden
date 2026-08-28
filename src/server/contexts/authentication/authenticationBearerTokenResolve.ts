import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { authenticationGuardErrorCreate } from "./authenticationGuardErrorCreate.js"

export function authenticationBearerTokenResolve(authorization: string | undefined): Result<string> {
  const op = "authenticationBearerTokenResolve"
  if (authorization === undefined) return authenticationGuardErrorCreate(op, "No access token provided")

  const marker = "Bearer "
  const markerIndex = authorization.lastIndexOf(marker)
  return resultCreate(markerIndex === -1 ? authorization : authorization.slice(markerIndex + marker.length))
}
