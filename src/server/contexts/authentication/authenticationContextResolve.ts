import type { Context } from "hono"
import type { Result } from "#result"
import type { AuthenticationContext } from "./authenticationContext.js"
import type { AuthenticationEnvironment } from "./authenticationEnvironment.js"
import type { AuthenticationOptions } from "./authenticationOptions.js"
import { clockCreate } from "../../../shared/clock/clockCreate.js"
import { identityAccessTokenClaimsDecode } from "../identity/identityAccessTokenClaimsDecode.js"
import { identityDeviceFindByUuidAndUser } from "../identity/identityDeviceFindByUuidAndUser.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { authenticationBearerTokenResolve } from "./authenticationBearerTokenResolve.js"
import { authenticationGuardErrorCreate } from "./authenticationGuardErrorCreate.js"
import { authenticationSecurityStampValidate } from "./authenticationSecurityStampValidate.js"

export async function authenticationContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: AuthenticationOptions,
): Promise<Result<AuthenticationContext>> {
  const op = "authenticationContextResolve"
  const tokenResult = authenticationBearerTokenResolve(context.req.header("Authorization"))
  if (!tokenResult.success) return tokenResult

  const database = options.database ?? context.get("database")
  if (database === undefined) return authenticationGuardErrorCreate(op, "Error getting DB")
  const clock = options.clock ?? clockCreate()
  const issuer = options.issuer ?? identityOriginResolve(options.publicOrigin, context.req.url)
  const claimsResult = await identityAccessTokenClaimsDecode(tokenResult.data, options.publicKey, issuer, clock)
  if (!claimsResult.success) return authenticationGuardErrorCreate(op, "Invalid claim")

  const claims = claimsResult.data
  const deviceResult = identityDeviceFindByUuidAndUser(database, claims.device, claims.sub)
  if (!deviceResult.success || deviceResult.data === null)
    return authenticationGuardErrorCreate(op, "Invalid device id")
  const userResult = identityUserFindByUuid(database, claims.sub)
  if (!userResult.success || userResult.data === null)
    return authenticationGuardErrorCreate(op, "Device has no user associated")

  const routeName = options.routeName ?? authenticationRouteNameResolve(context)
  const stampResult = authenticationSecurityStampValidate(userResult.data, claims.sstamp, routeName, database, clock)
  if (!stampResult.success) return stampResult

  return resultCreate({
    accessToken: tokenResult.data,
    claims,
    device: deviceResult.data,
    host: authenticationHostResolve(context, options.publicOrigin),
    ip: authenticationClientIpResolve(context),
    user: userResult.data,
  })
}

function authenticationRouteNameResolve(context: Context<AuthenticationEnvironment>): string | undefined {
  const routePath = context.req.routePath
  if (routePath !== "*" && routePath.length > 0) return routePath
  return context.req.path.length > 0 ? context.req.path : undefined
}

function authenticationHostResolve(
  context: Context<AuthenticationEnvironment>,
  publicOrigin: string | undefined,
): string {
  if (publicOrigin !== undefined) return identityOriginResolve(publicOrigin, context.req.url)
  const referer = context.req.header("Referer")
  if (referer !== undefined) return referer
  const protocol = context.req.header("X-Forwarded-Proto") ?? new URL(context.req.url).protocol.replace(":", "")
  const host = context.req.header("X-Forwarded-Host") ?? context.req.header("Host") ?? ""
  return `${protocol}://${host}`
}

function authenticationClientIpResolve(context: Context<AuthenticationEnvironment>): string {
  return context.req.header("x-real-ip") ?? context.req.header("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "0.0.0.0"
}
