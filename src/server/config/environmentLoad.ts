import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { environmentSchema, type Environment } from "./environmentSchema.js"

export function environmentLoad(source: Readonly<Record<string, string | undefined>> = Bun.env): Result<Environment> {
  const op = "environmentLoad"
  const result = v.safeParse(environmentSchema, source)
  if (!result.success) return resultErrorCreate(op, v.summarize(result.issues))
  return resultCreate(result.output)
}
