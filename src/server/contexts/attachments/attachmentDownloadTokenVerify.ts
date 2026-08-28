import type { JWTPayload, KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtVerify } from "../../../shared/crypto/jwtVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

export async function attachmentDownloadTokenVerify(
  token: string,
  cipherUuid: string,
  attachmentId: string,
  publicKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<boolean>> {
  if (publicKey === undefined) return resultCreate(false)
  const result = await jwtVerify<JWTPayload & { file_id?: unknown }>(token, publicKey, `${issuer}|file_download`, clock)
  return resultCreate(result.success && result.data.sub === cipherUuid && result.data.file_id === attachmentId)
}
