import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function attachmentDownloadTokenCreate(
  cipherUuid: string,
  attachmentId: string,
  privateKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<string>> {
  if (privateKey === undefined)
    return resultErrorCreate("attachmentDownloadTokenCreate", "Attachment token signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  return jwtSign(
    { nbf: now, exp: now + 300, iss: `${issuer}|file_download`, sub: cipherUuid, file_id: attachmentId },
    privateKey,
  )
}
