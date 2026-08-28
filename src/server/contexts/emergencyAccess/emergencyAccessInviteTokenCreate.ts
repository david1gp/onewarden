import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function emergencyAccessInviteTokenCreate(
  granteeUuid: string,
  email: string,
  emergencyAccessId: string,
  grantorName: string,
  grantorEmail: string,
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
  expirationHours: number,
): Promise<Result<string>> {
  const op = "emergencyAccessInviteTokenCreate"
  if (privateKey === undefined) return resultErrorCreate(op, "Emergency access invitation signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  const tokenResult = await jwtSign(
    {
      nbf: now,
      exp: now + expirationHours * 3_600,
      iss: `${issuer}|emergencyaccessinvite`,
      sub: granteeUuid,
      email,
      emer_id: emergencyAccessId,
      grantor_name: grantorName,
      grantor_email: grantorEmail,
    },
    privateKey,
  )
  if (!tokenResult.success) return resultErrorCreate(op, "Emergency access invitation signing failed.")
  return tokenResult
}
