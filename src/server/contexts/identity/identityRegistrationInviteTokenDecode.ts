import { errors, jwtVerify as joseJwtVerify, type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

type IdentityRegistrationInviteKind = "emergency" | "organization"

type IdentityRegistrationInviteClaims = {
  email: string
  id: string
}

function identityRegistrationInviteTokenError(op: string, error: unknown): Result<IdentityRegistrationInviteClaims> {
  if (error instanceof errors.JWTExpired)
    return resultErrorCreate(op, "Token has expired", { code: "platform.invalid-request", statusCode: 400 })
  if (
    error instanceof errors.JWTClaimValidationFailed &&
    (error.claim === "iss" || error.message.toLowerCase().includes("issuer"))
  ) {
    return resultErrorCreate(op, "Issuer is invalid", { code: "platform.invalid-request", statusCode: 400 })
  }
  if (error instanceof errors.JWTClaimValidationFailed && error.claim === "nbf" && error.reason !== "missing") {
    return resultErrorCreate(op, "Error decoding JWT: ImmatureSignature", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (error instanceof errors.JWTClaimValidationFailed && error.reason === "missing") {
    return resultErrorCreate(op, `Error decoding JWT: MissingRequiredClaim("${error.claim}")`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  if (error instanceof errors.JWSSignatureVerificationFailed) {
    return resultErrorCreate(op, "Error decoding JWT: InvalidSignature", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
}

export async function identityRegistrationInviteTokenDecode(
  token: string,
  kind: IdentityRegistrationInviteKind,
  issuer: string,
  publicKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<IdentityRegistrationInviteClaims>> {
  const op = "identityRegistrationInviteTokenDecode"
  if (publicKey === undefined)
    return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })

  try {
    const claimId = kind === "emergency" ? "emer_id" : "member_id"
    const result = await joseJwtVerify<Record<string, unknown>>(token.replace(/\s/g, ""), publicKey, {
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: clock.now(),
      issuer: `${issuer}|${kind === "emergency" ? "emergencyaccessinvite" : "invite"}`,
      requiredClaims: ["iss", "exp", "nbf", "sub"],
    })
    if (typeof result.payload.sub !== "string")
      return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
    const email = result.payload.email
    const id = result.payload[claimId]
    if (typeof email !== "string" || typeof id !== "string")
      return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
    return resultCreate({ email, id })
  } catch (error) {
    return identityRegistrationInviteTokenError(op, error)
  }
}
