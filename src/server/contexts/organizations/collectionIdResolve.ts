import type { Context } from "hono"
import * as v from "valibot"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { collectionIdSchema } from "./collectionIdSchema.js"

export function collectionIdResolve(context: Context<AuthenticationEnvironment>): string | undefined {
  const parameters = context.req.param()
  const path = new URL(context.req.url).pathname.split("/").filter((segment) => segment.length > 0)
  const candidates = [parameters.collectionId, parameters.collection_id, parameters.colId, path[3], path[4]]
  for (const candidate of candidates) {
    const parsed = v.safeParse(collectionIdSchema, candidate)
    if (parsed.success) return parsed.output
  }
  const queryResult = v.safeParse(collectionIdSchema, context.req.query("collectionId"))
  return queryResult.success ? queryResult.output : undefined
}
