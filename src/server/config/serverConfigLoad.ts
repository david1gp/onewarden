import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { serverConfigSchema, type ServerConfig } from "./serverConfigSchema.js"

export function serverConfigLoad(source: Readonly<Record<string, string | undefined>> = Bun.env): Result<ServerConfig> {
  const op = "serverConfigLoad"
  const result = v.safeParse(serverConfigSchema, source)
  if (!result.success) return resultErrorCreate(op, v.summarize(result.issues))
  return resultCreate(result.output)
}
