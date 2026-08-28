import { type Result } from "#result"
import type { JWTPayload, KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtVerify } from "../../../shared/crypto/jwtVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

export async function sendAccessTokenVerify(
  token: string | undefined,
  sendUuid: string,
  publicKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<boolean>> {
  if (token === undefined || publicKey === undefined) return resultCreate(false)
  const result = await jwtVerify<JWTPayload>(token, publicKey, `${issuer}|send`, clock)
  if (!result.success || result.data.sub !== sendUuid) return resultCreate(false)
  return resultCreate(true)
}
