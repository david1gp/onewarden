import { errors, jwtVerify as joseJwtVerify, type KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

type OrganizationMembershipInviteClaims = {
  email: string
  invitedByEmail: string | null
  memberId: string
  organizationId: string
  subject: string
}

export async function organizationMembershipInviteTokenDecode(
  token: string,
  issuer: string,
  publicKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<OrganizationMembershipInviteClaims>> {
  const op = "organizationMembershipInviteTokenDecode"
  if (publicKey === undefined)
    return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
  try {
    const result = await joseJwtVerify<Record<string, unknown>>(token.replace(/\s/g, ""), publicKey, {
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: clock.now(),
      issuer: `${issuer}|invite`,
      requiredClaims: ["iss", "exp", "nbf", "sub", "email", "org_id", "member_id"],
    })
    const claims = result.payload
    if (
      typeof claims.sub !== "string" ||
      claims.sub.length === 0 ||
      typeof claims.email !== "string" ||
      claims.email.length === 0 ||
      typeof claims.org_id !== "string" ||
      claims.org_id.length === 0 ||
      typeof claims.member_id !== "string" ||
      claims.member_id.length === 0 ||
      (claims.invited_by_email !== undefined &&
        claims.invited_by_email !== null &&
        typeof claims.invited_by_email !== "string")
    )
      return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
    return resultCreate({
      email: claims.email,
      invitedByEmail:
        claims.invited_by_email === null || claims.invited_by_email === undefined ? null : claims.invited_by_email,
      memberId: claims.member_id,
      organizationId: claims.org_id,
      subject: claims.sub,
    })
  } catch (error) {
    if (error instanceof errors.JWTExpired)
      return resultErrorCreate(op, "Token has expired", { code: "platform.invalid-request", statusCode: 400 })
    if (
      error instanceof errors.JWTClaimValidationFailed &&
      (error.claim === "iss" || error.message.toLowerCase().includes("issuer"))
    )
      return resultErrorCreate(op, "Issuer is invalid", { code: "platform.invalid-request", statusCode: 400 })
    if (error instanceof errors.JWTClaimValidationFailed && error.claim === "nbf" && error.reason !== "missing")
      return resultErrorCreate(op, "Error decoding JWT: ImmatureSignature", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    if (error instanceof errors.JWTClaimValidationFailed && error.reason === "missing")
      return resultErrorCreate(op, `Error decoding JWT: MissingRequiredClaim("${error.claim}")`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    if (error instanceof errors.JWSSignatureVerificationFailed)
      return resultErrorCreate(op, "Error decoding JWT: InvalidSignature", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
  }
}
