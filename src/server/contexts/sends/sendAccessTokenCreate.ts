import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { KeyInput } from "jose"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { sendFindByAccessId } from "./sendFindByAccessId.js"
import { sendIsAccessible } from "./sendIsAccessible.js"
import { sendPasswordVerify } from "./sendPasswordVerify.js"
import { sendRegisterAccess } from "./sendRegisterAccess.js"

export async function sendAccessTokenCreate(
  database: DatabaseConnection,
  accessId: string,
  password: string | undefined,
  ip: string,
  privateKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<{ accessToken: string; expiresIn: number }>> {
  const sendResult = sendFindByAccessId(database, accessId)
  if (!sendResult.success) return sendAccessTokenError("Send lookup failed.", 404, "send_id_invalid")
  if (sendResult.data === null) return sendAccessTokenError(`Can't find ${accessId}`, 404, "send_id_invalid")
  const send = sendResult.data
  if (send.maxAccessCount !== null && send.accessCount >= send.maxAccessCount)
    return sendAccessTokenError("Send max access reached.", 404, "send_id_invalid")
  if (!sendIsAccessible(send, clock)) return sendAccessTokenError("Send is not accessible.", 404, "send_id_invalid")
  if (send.passwordHash !== null) {
    if (password === undefined) return sendAccessTokenError("Password required.", 400, "password_hash_b64_required")
    const passwordResult = await sendPasswordVerify(send, password)
    if (!passwordResult.success || !passwordResult.data)
      return sendAccessTokenError(`Invalid password from ${ip}`, 404, "password_hash_b64_invalid")
  }
  if (privateKey === undefined) return resultErrorCreate("sendAccessTokenCreate", "Send token signing is unavailable.")
  const now = Math.floor(clock.now().getTime() / 1_000)
  const tokenResult = await jwtSign({ nbf: now, exp: now + 120, iss: `${issuer}|send`, sub: send.uuid }, privateKey)
  if (!tokenResult.success) return tokenResult
  const accessResult = sendRegisterAccess(database, send, clock)
  if (!accessResult.success) return accessResult
  if (!accessResult.data) return sendAccessTokenError("Send max access reached.", 404, "send_id_invalid")
  return resultCreate({ accessToken: tokenResult.data, expiresIn: 120 })
}

function sendAccessTokenError(message: string, statusCode: number, sendAccessErrorType: string) {
  return resultErrorCreate("sendAccessTokenCreate", message, {
    code: statusCode === 404 ? "platform.not-found" : "platform.invalid-request",
    errorData: JSON.stringify({ sendAccessErrorType }),
    statusCode,
  })
}
