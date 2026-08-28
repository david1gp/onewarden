import { type Context } from "hono"
import { type Result } from "#result"
import * as v from "valibot"
import { requestValidationParse } from "./requestValidationParse.js"

export function requestPathParse<const TSchema extends v.GenericSchema>(
  context: Context,
  schema: TSchema,
): Result<v.InferOutput<TSchema>> {
  return requestValidationParse("requestPathParse", context.req.param(), schema)
}
