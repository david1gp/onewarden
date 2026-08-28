import { type Result } from "#result"
import type { JWTPayload, KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtVerify } from "../../../shared/crypto/jwtVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

export async function sendDownloadTokenVerify(
  token: string,
  sendUuid: string,
  fileId: string,
  publicKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<boolean>> {
  if (publicKey === undefined) return resultCreate(false)
  const result = await jwtVerify<JWTPayload>(token, publicKey, `${issuer}|send`, clock)
  return resultCreate(result.success && result.data.sub === `${sendUuid}/${fileId}`)
}
