import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { AuthenticationClientVersion } from "./authenticationClientVersionSchema.js"
import { authenticationClientVersionParse } from "./authenticationClientVersionParse.js"

export function authenticationClientVersionOptionalParse(
  value: string | undefined,
): Result<AuthenticationClientVersion | null> {
  if (value === undefined) return resultCreate(null)
  return authenticationClientVersionParse(value)
}
