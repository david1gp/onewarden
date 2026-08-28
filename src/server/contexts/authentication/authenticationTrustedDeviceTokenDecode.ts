import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtVerify } from "../../../shared/crypto/jwtVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import * as v from "valibot"
import {
  authenticationTrustedDeviceClaimsSchema,
  type AuthenticationTrustedDeviceClaims,
} from "./authenticationTrustedDeviceClaimsSchema.js"

export async function authenticationTrustedDeviceTokenDecode(
  token: string,
  issuer: string,
  publicKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<AuthenticationTrustedDeviceClaims>> {
  const op = "authenticationTrustedDeviceTokenDecode"
  if (publicKey === undefined) return resultErrorCreate(op, "Trusted device token verification is unavailable.")
  const verifiedResult = await jwtVerify(token, publicKey, `${issuer}|2faremember`, clock)
  if (!verifiedResult.success) return resultErrorCreate(op, "Trusted device token verification failed.")
  const claimsResult = v.safeParse(authenticationTrustedDeviceClaimsSchema, verifiedResult.data)
  if (!claimsResult.success) return resultErrorCreate(op, "Trusted device token claims are invalid.")
  return resultCreate(claimsResult.output)
}
