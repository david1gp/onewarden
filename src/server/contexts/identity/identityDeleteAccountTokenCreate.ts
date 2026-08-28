import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function identityDeleteAccountTokenCreate(
  userUuid: string,
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
  expirationHours: number,
): Promise<Result<string>> {
  const op = "identityDeleteAccountTokenCreate"
  if (privateKey === undefined) return resultErrorCreate(op, "Account deletion token signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  const tokenResult = await jwtSign(
    {
      nbf: now,
      exp: now + expirationHours * 3_600,
      iss: `${issuer}|delete`,
      sub: userUuid,
    },
    privateKey,
  )
  if (!tokenResult.success) return resultErrorCreate(op, "Account deletion token signing failed.")
  return resultCreate(tokenResult.data)
}
