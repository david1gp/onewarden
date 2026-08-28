import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { identityConfigSchema, type IdentityConfig } from "./identityConfigSchema.js"

export function identityConfigLoad(
  source: Readonly<Record<string, string | undefined>> = Bun.env,
): Result<IdentityConfig> {
  const op = "identityConfigLoad"
  const result = v.safeParse(identityConfigSchema, source)
  if (!result.success) return resultErrorCreate(op, v.summarize(result.issues))
  return resultCreate(result.output)
}
