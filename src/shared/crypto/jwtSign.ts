import { type JWTPayload, type KeyInput, SignJWT } from "jose"
import { type Result } from "#result"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

export async function jwtSign<T extends JWTPayload>(claims: T, privateKey: KeyInput): Promise<Result<string>> {
  const op = "jwtSign"

  try {
    const token = await new SignJWT(claims).setProtectedHeader({ typ: "JWT", alg: "RS256" }).sign(privateKey)
    return resultCreate(token)
  } catch {
    return resultErrorCreate(op, "JWT signing failed.")
  }
}
