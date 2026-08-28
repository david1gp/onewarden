import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { iconConfigSchema, type IconConfig } from "./iconConfigSchema.js"

export function iconConfigLoad(source: Readonly<Record<string, string | undefined>> = Bun.env): Result<IconConfig> {
  const op = "iconConfigLoad"
  const result = v.safeParse(iconConfigSchema, source)
  if (!result.success) return resultErrorCreate(op, v.summarize(result.issues))
  return resultCreate(result.output)
}
