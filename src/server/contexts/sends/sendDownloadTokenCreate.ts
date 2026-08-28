import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { KeyInput } from "jose"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function sendDownloadTokenCreate(
  sendUuid: string,
  fileId: string,
  privateKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<string>> {
  if (privateKey === undefined)
    return resultErrorCreate("sendDownloadTokenCreate", "Send token signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  return jwtSign({ nbf: now, exp: now + 120, iss: `${issuer}|send`, sub: `${sendUuid}/${fileId}` }, privateKey)
}
