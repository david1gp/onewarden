import type { Context } from "hono"
import * as v from "valibot"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { groupIdSchema } from "./groupIdSchema.js"

export function groupIdResolve(context: Context<AuthenticationEnvironment>): string | undefined {
  const parameters = context.req.param()
  const path = new URL(context.req.url).pathname.split("/").filter((segment) => segment.length > 0)
  const candidates = [parameters.groupId, parameters.group_id, parameters.id, path[4], path[5]]
  for (const candidate of candidates) {
    const parsed = v.safeParse(groupIdSchema, candidate)
    if (parsed.success) return parsed.output
  }
  const queryResult = v.safeParse(groupIdSchema, context.req.query("groupId"))
  return queryResult.success ? queryResult.output : undefined
}
