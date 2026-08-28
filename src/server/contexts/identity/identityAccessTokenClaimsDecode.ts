import { type Result } from "#result"
import { type JWTPayload, type KeyInput } from "jose"
import * as v from "valibot"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtVerify } from "../../../shared/crypto/jwtVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { identityAccessTokenClaimsSchema, type IdentityAccessTokenClaims } from "./identityAccessTokenClaimsSchema.js"

export async function identityAccessTokenClaimsDecode(
  token: string,
  publicKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<IdentityAccessTokenClaims>> {
  const op = "identityAccessTokenClaimsDecode"
  if (publicKey === undefined) return resultErrorCreate(op, "Identity token verification is unavailable.")
  const verifiedResult = await jwtVerify<JWTPayload>(token, publicKey, `${issuer}|login`, clock)
  if (!verifiedResult.success) return resultErrorCreate(op, "Access token verification failed.")
  const claimsResult = v.safeParse(identityAccessTokenClaimsSchema, verifiedResult.data)
  if (!claimsResult.success) return resultErrorCreate(op, "Access token claims are invalid.")
  return resultCreate(claimsResult.output)
}
