import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import {
  authenticationSecurityStampExceptionSchema,
  type AuthenticationSecurityStampException,
} from "./authenticationSecurityStampExceptionSchema.js"

export function authenticationSecurityStampExceptionParse(
  value: string | null,
): Result<AuthenticationSecurityStampException> {
  const op = "authenticationSecurityStampExceptionParse"
  if (value === null) return resultErrorCreate(op, "Security stamp exception is invalid.")

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(value)
  } catch {
    return resultErrorCreate(op, "Security stamp exception is invalid.")
  }
  const parsed = v.safeParse(authenticationSecurityStampExceptionSchema, parsedJson)
  if (!parsed.success) return resultErrorCreate(op, "Security stamp exception is invalid.")
  return resultCreate(parsed.output)
}
