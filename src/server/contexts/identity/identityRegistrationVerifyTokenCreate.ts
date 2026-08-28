import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityRegistrationVerifyClaims } from "./identityRegistrationVerifyClaims.js"

export async function identityRegistrationVerifyTokenCreate(
  email: string,
  name: string | null | undefined,
  verified: boolean,
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<string>> {
  const op = "identityRegistrationVerifyTokenCreate"
  if (privateKey === undefined) return resultErrorCreate(op, "Registration verification token signing is unavailable.")

  const now = Math.floor(clock.now().getTime() / 1000)
  const claims: IdentityRegistrationVerifyClaims = {
    nbf: now,
    exp: now + 1_800,
    iss: `${issuer}|register_verify`,
    sub: email,
    name: name ?? null,
    verified,
  }
  const tokenResult = await jwtSign(claims, privateKey)
  if (!tokenResult.success) return resultErrorCreate(op, "Registration verification token signing failed.")
  return resultCreate(tokenResult.data)
}
