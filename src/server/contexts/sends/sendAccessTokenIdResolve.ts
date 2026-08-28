import { type Result } from "#result"
import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import { jwtVerify } from "../../../shared/crypto/jwtVerify.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function sendAccessTokenIdResolve(
  token: string,
  publicKey: KeyInput | undefined,
  issuer: string,
  clock: Clock,
): Promise<Result<string>> {
  const op = "sendAccessTokenIdResolve"
  if (publicKey === undefined)
    return resultErrorCreate(op, "Invalid claim", { code: "platform.unauthorized", statusCode: 401 })
  const verifiedResult = await jwtVerify(token, publicKey, `${issuer}|send`, clock)
  if (!verifiedResult.success || typeof verifiedResult.data.sub !== "string")
    return resultErrorCreate(op, "Invalid claim", { code: "platform.unauthorized", statusCode: 401 })
  return { success: true, data: verifiedResult.data.sub }
}
