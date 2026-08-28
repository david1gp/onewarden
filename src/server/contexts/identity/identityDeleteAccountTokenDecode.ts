import { jwtVerify as joseJwtVerify, type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

type IdentityDeleteAccountClaims = {
  nbf: number
  exp: number
  iss: string
  sub: string
}

export async function identityDeleteAccountTokenDecode(
  token: string,
  issuer: string,
  publicKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<IdentityDeleteAccountClaims>> {
  const op = "identityDeleteAccountTokenDecode"
  if (publicKey === undefined) return resultErrorCreate(op, "Invalid claim")
  try {
    const result = await joseJwtVerify<Record<string, unknown>>(token.replace(/\s/g, ""), publicKey, {
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: clock.now(),
      issuer: `${issuer}|delete`,
      requiredClaims: ["iss", "exp", "nbf", "sub"],
    })
    const claims = result.payload
    if (
      typeof claims.nbf !== "number" ||
      typeof claims.exp !== "number" ||
      typeof claims.iss !== "string" ||
      typeof claims.sub !== "string"
    )
      return resultErrorCreate(op, "Invalid claim")
    return resultCreate({ nbf: claims.nbf, exp: claims.exp, iss: claims.iss, sub: claims.sub })
  } catch {
    return resultErrorCreate(op, "Invalid claim")
  }
}
