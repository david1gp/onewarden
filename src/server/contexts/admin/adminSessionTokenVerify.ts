import { type JWTPayload, jwtVerify as joseJwtVerify, type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

type AdminSessionClaims = JWTPayload & { sub: "admin_panel" }

export async function adminSessionTokenVerify(
  token: string,
  issuer: string,
  publicKey: KeyInput | undefined,
  clock: Clock,
): Promise<Result<AdminSessionClaims>> {
  const op = "adminSessionTokenVerify"
  if (publicKey === undefined)
    return resultErrorCreate(op, "Admin verification key is unavailable.", { code: "platform.unauthorized" })
  try {
    const verified = await joseJwtVerify<AdminSessionClaims>(token, publicKey, {
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: clock.now(),
      issuer,
      requiredClaims: ["iss", "exp", "sub"],
    })
    if (verified.payload.sub !== "admin_panel")
      return resultErrorCreate(op, "Admin session is invalid.", { code: "platform.unauthorized" })
    return resultCreate(verified.payload)
  } catch {
    return resultErrorCreate(op, "Admin session is invalid.", { code: "platform.unauthorized" })
  }
}
