import { errors, jwtVerify as joseJwtVerify, type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityRegistrationVerifyClaims } from "./identityRegistrationVerifyClaims.js"

function identityRegistrationVerifyDecodeError(op: string, error: unknown) {
  if (
    error instanceof errors.JWTExpired ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "ERR_JWT_EXPIRED")
  ) {
    return resultErrorCreate(op, "Token has expired", { code: "platform.invalid-request", statusCode: 400 })
  }

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

export async function identityRegistrationVerifyTokenDecode(
  token: string,
  issuer: string,
  publicKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<IdentityRegistrationVerifyClaims>> {
  const op = "identityRegistrationVerifyTokenDecode"
  if (publicKey === undefined)
    return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })

  try {
    const result = await joseJwtVerify<IdentityRegistrationVerifyClaims>(token.replace(/\s/g, ""), publicKey, {
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: clock.now(),
      issuer: `${issuer}|register_verify`,
      requiredClaims: ["iss", "exp", "nbf", "sub"],
    })
    const claims = result.payload
    if (
      typeof claims.nbf !== "number" ||
      typeof claims.exp !== "number" ||
      typeof claims.iss !== "string" ||
      typeof claims.sub !== "string" ||
      typeof claims.verified !== "boolean" ||
      (claims.name !== undefined && claims.name !== null && typeof claims.name !== "string")
    ) {
      return resultErrorCreate(op, "Token is invalid", { code: "platform.invalid-request", statusCode: 400 })
    }
    return resultCreate({
      nbf: claims.nbf,
      exp: claims.exp,
      iss: claims.iss,
      sub: claims.sub,
      name: claims.name ?? null,
      verified: claims.verified,
    })
  } catch (error) {
    return identityRegistrationVerifyDecodeError(op, error)
  }
}
