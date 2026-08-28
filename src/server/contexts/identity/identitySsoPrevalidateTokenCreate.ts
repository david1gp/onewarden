import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

export async function identitySsoPrevalidateTokenCreate(
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<string>> {
  const op = "identitySsoPrevalidateTokenCreate"
  if (privateKey === undefined) return resultErrorCreate(op, "Identity token signing is unavailable.")
  const nbf = Math.floor(clock.now().getTime() / 1_000)
  const claims = {
    nbf,
    exp: nbf + 2 * 60,
    iss: `${issuer}|sso`,
    sub: "vaultwarden" as const,
  }
  const result = await jwtSign(claims, privateKey)
  if (!result.success) return resultErrorCreate(op, "Identity SSO token signing failed.")
  return resultCreate(result.data)
}
