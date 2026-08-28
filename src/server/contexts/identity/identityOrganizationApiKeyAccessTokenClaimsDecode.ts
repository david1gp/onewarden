import type { KeyInput } from "jose"
import { type Result } from "#result"
import * as v from "valibot"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtVerify } from "../../../shared/crypto/jwtVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import {
  identityOrganizationApiKeyAccessTokenClaimsSchema,
  type IdentityOrganizationApiKeyAccessTokenClaims,
} from "./identityOrganizationApiKeyAccessTokenClaimsSchema.js"

export async function identityOrganizationApiKeyAccessTokenClaimsDecode(
  token: string,
  publicKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<IdentityOrganizationApiKeyAccessTokenClaims>> {
  const op = "identityOrganizationApiKeyAccessTokenClaimsDecode"
  if (publicKey === undefined) return resultErrorCreate(op, "Identity token verification is unavailable.")
  const verifiedResult = await jwtVerify(token, publicKey, `${issuer}|api.organization`, clock)
  if (!verifiedResult.success) return resultErrorCreate(op, "Access token verification failed.")
  const claimsResult = v.safeParse(identityOrganizationApiKeyAccessTokenClaimsSchema, verifiedResult.data)
  if (!claimsResult.success) return resultErrorCreate(op, "Access token claims are invalid.")
  return resultCreate(claimsResult.output)
}
