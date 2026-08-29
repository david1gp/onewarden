import type { Context } from "hono"
import * as v from "valibot"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { organizationIdSchema } from "./organizationIdSchema.js"

export function organizationIdResolve(context: Context<AuthenticationEnvironment>): string | undefined {
  const parameters = context.req.param()
  const path = new URL(context.req.url).pathname.split("/").filter((segment) => segment.length > 0)
  const candidates = [
    parameters.organizationId,
    parameters.organization_id,
    parameters.orgId,
    parameters.org_id,
    path[2],
    parameters.id,
    path[1],
  ]
  for (const candidate of candidates) {
    const parsed = v.safeParse(organizationIdSchema, candidate)
    if (parsed.success) return parsed.output
  }
  const queryResult = v.safeParse(organizationIdSchema, context.req.query("organizationId"))
  return queryResult.success ? queryResult.output : undefined
}
