import { type Context } from "hono"
import { type Result } from "#result"
import * as v from "valibot"
import { apiErrorCreate } from "../api/apiErrorCreate.js"
import { requestValidationParse } from "./requestValidationParse.js"

export async function requestBodyParse<const TSchema extends v.GenericSchema>(
  context: Context,
  schema: TSchema,
): Promise<Result<v.InferOutput<TSchema>>> {
  const op = "requestBodyParse"
  let input: unknown
  try {
    input = await context.req.json()
  } catch {
    const message = "Request body must be valid JSON."
    return apiErrorCreate(op, "platform.invalid-request", message, { "": [message] })
  }
  return requestValidationParse(op, input, schema)
}
