import { errors, jwtVerify, type KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import * as v from "valibot"
import { organizationIdSchema } from "./organizationIdSchema.js"

type OrganizationPolicyInviteToken = {
  email: string
  memberUuid: string
  organizationUuid: string
  userUuid: string
}

export async function organizationPolicyInviteTokenDecode(
  token: string,
  issuer: string,
  publicKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<OrganizationPolicyInviteToken>> {
  const op = "organizationPolicyInviteTokenDecode"
  if (publicKey === undefined)
    return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
  try {
    const result = await jwtVerify<Record<string, unknown>>(token.replace(/\s/g, ""), publicKey, {
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: clock.now(),
      issuer: `${issuer}|invite`,
      requiredClaims: ["iss", "exp", "nbf", "sub"],
    })
    const claims = result.payload
    const organizationResult = v.safeParse(organizationIdSchema, claims.org_id)
    const memberUuid = typeof claims.member_id === "string" ? claims.member_id : undefined
    const userUuid = typeof claims.sub === "string" ? claims.sub : undefined
    const email = typeof claims.email === "string" ? claims.email : undefined
    if (
      !organizationResult.success ||
      userUuid === undefined ||
      email === undefined ||
      memberUuid === undefined ||
      (claims.invited_by_email !== undefined &&
        claims.invited_by_email !== null &&
        typeof claims.invited_by_email !== "string")
    )
      return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
    return resultCreate({
      email,
      memberUuid,
      organizationUuid: organizationResult.output,
      userUuid,
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
