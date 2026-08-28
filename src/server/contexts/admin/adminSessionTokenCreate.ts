import { type KeyInput, SignJWT } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function adminSessionTokenCreate(
  issuer: string,
  privateKey: KeyInput | undefined,
  clock: Clock,
  lifetimeMinutes: number,
): Promise<Result<string>> {
  const op = "adminSessionTokenCreate"
  if (privateKey === undefined)
    return resultErrorCreate(op, "Admin signing key is unavailable.", { code: "platform.internal" })
  const now = Math.floor(clock.now().getTime() / 1_000)
  try {
    const token = await new SignJWT({ sub: "admin_panel" })
      .setProtectedHeader({ typ: "JWT", alg: "RS256" })
      .setIssuer(issuer)
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + lifetimeMinutes * 60)
      .sign(privateKey)
    return resultCreate(token)
  } catch {
    return resultErrorCreate(op, "Admin session signing failed.", { code: "platform.internal" })
  }
}
