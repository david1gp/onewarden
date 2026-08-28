import { errors, jwtVerify as joseJwtVerify, type KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export type EmergencyAccessInviteClaims = {
  email: string
  emergencyAccessId: string
  grantorName: string
  grantorEmail: string
  subject: string
}

export async function emergencyAccessInviteTokenDecode(
  token: string,
  issuer: string,
  publicKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<EmergencyAccessInviteClaims>> {
  const op = "emergencyAccessInviteTokenDecode"
  if (publicKey === undefined) return resultErrorCreate(op, "Emergency access invitation is invalid.")
  try {
    const result = await joseJwtVerify<Record<string, unknown>>(token.replace(/\s/g, ""), publicKey, {
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: clock.now(),
      issuer: `${issuer}|emergencyaccessinvite`,
      requiredClaims: ["iss", "exp", "nbf", "sub"],
    })
    const claims = result.payload
    if (
      typeof claims.sub !== "string" ||
      typeof claims.email !== "string" ||
      typeof claims.emer_id !== "string" ||
      typeof claims.grantor_name !== "string" ||
      typeof claims.grantor_email !== "string"
    )
      return resultErrorCreate(op, "Emergency access invitation is invalid.")
    return resultCreate({
      email: claims.email,
      emergencyAccessId: claims.emer_id,
      grantorName: claims.grantor_name,
      grantorEmail: claims.grantor_email,
      subject: claims.sub,
    })
  } catch (error) {
    const message = error instanceof errors.JWTExpired ? "Token has expired" : "Emergency access invitation is invalid."
    return resultErrorCreate(op, message)
  }
}
