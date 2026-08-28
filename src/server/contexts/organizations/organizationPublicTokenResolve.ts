import type { Context } from "hono"
import { compactVerify, type KeyInput } from "jose"
import type { Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { identityOrganizationApiKeyFindByOrganizationUuid } from "../identity/identityOrganizationApiKeyFindByOrganizationUuid.js"
import {
  identityOrganizationApiKeyAccessTokenClaimsSchema,
  type IdentityOrganizationApiKeyAccessTokenClaims,
} from "../identity/identityOrganizationApiKeyAccessTokenClaimsSchema.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationBearerTokenResolve } from "../authentication/authenticationBearerTokenResolve.js"
import { authenticationGuardErrorCreate } from "../authentication/authenticationGuardErrorCreate.js"
import type { OrganizationPublicRouteOptions } from "./organizationPublicRouteOptions.js"

export async function organizationPublicTokenResolve(
  context: Context<AuthenticationEnvironment>,
  options: OrganizationPublicRouteOptions,
): Promise<Result<string>> {
  const op = "organizationPublicTokenResolve"
  const tokenResult = authenticationBearerTokenResolve(context.req.header("Authorization"))
  if (!tokenResult.success) return tokenResult

  const database = options.database ?? context.get("database")
  if (database === undefined) return authenticationGuardErrorCreate(op, "Error getting DB")

  const claimsResult = await organizationPublicTokenClaimsVerify(tokenResult.data, options.publicKey)
  if (!claimsResult.success) return authenticationGuardErrorCreate(op, "Invalid claim")
  const claims = claimsResult.data
  const now = Math.floor(options.clock.now().getTime() / 1_000)
  if (now < claims.nbf) return authenticationGuardErrorCreate(op, "Token issued in the future")
  if (now > claims.exp) return authenticationGuardErrorCreate(op, "Token expired")

  const issuer = identityOriginResolve(options.publicOrigin, context.req.url)
  if (claims.iss !== `${issuer}|${claims.scope[0] ?? ""}`)
    return authenticationGuardErrorCreate(op, "Token not issued by this server")
  if (!claims.client_id.startsWith("organization.")) return authenticationGuardErrorCreate(op, "Malformed client_id")

  const organizationUuid = claims.client_id.slice("organization.".length)
  const apiKeyResult = identityOrganizationApiKeyFindByOrganizationUuid(database, organizationUuid)
  if (!apiKeyResult.success || apiKeyResult.data === null)
    return authenticationGuardErrorCreate(op, "Invalid client_id")
  if (apiKeyResult.data.organizationUuid !== claims.client_sub)
    return authenticationGuardErrorCreate(op, "Token not issued for this org")
  if (apiKeyResult.data.uuid !== claims.sub)
    return authenticationGuardErrorCreate(op, "Token not issued for this client")

  return resultCreate(claims.client_sub)
}

async function organizationPublicTokenClaimsVerify(
  token: string,
  publicKey: KeyInput | undefined,
): Promise<Result<IdentityOrganizationApiKeyAccessTokenClaims>> {
  const op = "organizationPublicTokenClaimsVerify"
  if (publicKey === undefined) return resultErrorCreate(op, "Identity token verification is unavailable.")

  try {
    const verified = await compactVerify(token, publicKey, { algorithms: ["RS256"] })
    const payload = JSON.parse(new TextDecoder().decode(verified.payload)) as unknown
    const claimsResult = v.safeParse(identityOrganizationApiKeyAccessTokenClaimsSchema, payload)
    if (!claimsResult.success) return resultErrorCreate(op, "Access token claims are invalid.")
    return resultCreate(claimsResult.output)
  } catch {
    return resultErrorCreate(op, "Access token verification failed.")
  }
}
