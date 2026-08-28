import { type Context } from "hono"
import { type Result } from "#result"
import * as v from "valibot"
import { requestValidationParse } from "./requestValidationParse.js"

export function requestQueryParse<const TSchema extends v.GenericSchema>(
  context: Context,
  schema: TSchema,
): Result<v.InferOutput<TSchema>> {
  return requestValidationParse("requestQueryParse", context.req.query(), schema)
}
