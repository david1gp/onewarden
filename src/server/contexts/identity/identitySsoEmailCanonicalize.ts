import type { Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"

const identitySsoEmailSchema = v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email())

export function identitySsoEmailCanonicalize(email: string): Result<string> {
  const op = "identitySsoEmailCanonicalize"
  const parsed = v.safeParse(identitySsoEmailSchema, email)
  if (!parsed.success) return identityDomainErrorCreate(op, "SSO provider returned an invalid email")
  return resultCreate(parsed.output)
}
