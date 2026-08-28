import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { authenticationGuardErrorCreate } from "./authenticationGuardErrorCreate.js"
import {
  authenticationClientVersionSchema,
  type AuthenticationClientVersion,
} from "./authenticationClientVersionSchema.js"

export function authenticationClientVersionParse(value: string | undefined): Result<AuthenticationClientVersion> {
  const op = "authenticationClientVersionParse"
  if (value === undefined) return authenticationGuardErrorCreate(op, "No Bitwarden-Client-Version header provided")

  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(
      value,
    )
  if (match === null) return authenticationGuardErrorCreate(op, "Invalid Bitwarden-Client-Version header provided")

  const preRelease = match[4]?.split(".") ?? []
  const build = match[5]?.split(".") ?? []
  if (preRelease.some(authenticationClientVersionNumericIdentifierInvalid))
    return authenticationGuardErrorCreate(op, "Invalid Bitwarden-Client-Version header provided")
  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  if (![major, minor, patch].every(Number.isSafeInteger))
    return authenticationGuardErrorCreate(op, "Invalid Bitwarden-Client-Version header provided")
  const parsed = v.safeParse(authenticationClientVersionSchema, {
    build,
    major,
    minor,
    patch,
    preRelease,
    raw: value,
  })
  if (!parsed.success) return authenticationGuardErrorCreate(op, "Invalid Bitwarden-Client-Version header provided")
  return resultCreate(parsed.output)
}

function authenticationClientVersionNumericIdentifierInvalid(identifier: string): boolean {
  return /^\d+$/.test(identifier) && identifier.length > 1 && identifier.startsWith("0")
}
