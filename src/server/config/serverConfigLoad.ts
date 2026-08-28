import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { serverConfigSchema, type ServerConfig } from "./serverConfigSchema.js"

export function serverConfigLoad(source: Readonly<Record<string, string | undefined>> = Bun.env): Result<ServerConfig> {
  const op = "serverConfigLoad"
  const result = v.safeParse(serverConfigSchema, source)
  if (!result.success) return resultErrorCreate(op, v.summarize(result.issues))
  if (result.output.PUSH_ENABLED) {
    if (result.output.PUSH_INSTALLATION_ID === "" || result.output.PUSH_INSTALLATION_KEY === "")
      return resultErrorCreate(op, "Push notifications require PUSH_INSTALLATION_ID and PUSH_INSTALLATION_KEY.")
    for (const [name, value] of [
      ["PUSH_RELAY_URI", result.output.PUSH_RELAY_URI],
      ["PUSH_IDENTITY_URI", result.output.PUSH_IDENTITY_URI],
    ] as const) {
      const urlResult = v.safeParse(v.pipe(v.string(), v.url()), value)
      if (!urlResult.success) return resultErrorCreate(op, `${name} must be a valid URL.`)
      if (new URL(value).protocol !== "https:") return resultErrorCreate(op, `${name} must start with https://.`)
    }
  }
  return resultCreate(result.output)
}
