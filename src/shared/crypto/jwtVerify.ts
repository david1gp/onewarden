import { type JWTPayload, jwtVerify as joseJwtVerify, type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../clock/clock.js"
import { clockCreate } from "../clock/clockCreate.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

export async function jwtVerify<T extends JWTPayload>(
  token: string,
  publicKey: KeyInput,
  issuer: string,
  clock: Clock = clockCreate(),
): Promise<Result<T>> {
  const op = "jwtVerify"

  try {
    const verified = await joseJwtVerify<T>(token.replace(/\s/g, ""), publicKey, {
      algorithms: ["RS256"],
      clockTolerance: 30,
      currentDate: clock.now(),
      issuer,
      requiredClaims: ["iss", "exp"],
    })
    return resultCreate(verified.payload)
  } catch {
    return resultErrorCreate(op, "JWT verification failed.")
  }
}
