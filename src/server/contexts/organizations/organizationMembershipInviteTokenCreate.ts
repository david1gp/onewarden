import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function organizationMembershipInviteTokenCreate(
  userUuid: string,
  email: string,
  organizationUuid: string,
  membershipUuid: string,
  invitedByEmail: string | null,
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
  expirationHours: number,
): Promise<Result<string>> {
  const op = "organizationMembershipInviteTokenCreate"
  if (privateKey === undefined) return resultErrorCreate(op, "Organization invitation signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  const tokenResult = await jwtSign(
    {
      nbf: now,
      exp: now + expirationHours * 3_600,
      iss: `${issuer}|invite`,
      sub: userUuid,
      email,
      org_id: organizationUuid,
      member_id: membershipUuid,
      invited_by_email: invitedByEmail,
    },
    privateKey,
  )
  if (!tokenResult.success) return resultErrorCreate(op, "Organization invitation signing failed.")
  return tokenResult
}
