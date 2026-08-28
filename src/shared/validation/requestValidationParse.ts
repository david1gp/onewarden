import { type Result } from "#result"
import * as v from "valibot"
import { apiErrorCreate } from "../api/apiErrorCreate.js"
import { resultCreate } from "../result/resultCreate.js"

export function requestValidationParse<const TSchema extends v.GenericSchema>(
  op: string,
  input: unknown,
  schema: TSchema,
): Result<v.InferOutput<TSchema>> {
  const parsed = v.safeParse(schema, input)
  if (parsed.success) return resultCreate(parsed.output)

  const flattened = v.flatten(parsed.issues)
  const details: Record<string, string[]> = {}
  if (flattened.root !== undefined) details[""] = [...flattened.root]
  if (flattened.nested !== undefined) {
    for (const [field, messages] of Object.entries(flattened.nested)) {
      if (messages !== undefined) details[field] = [...messages]
    }
  }
  if (flattened.other !== undefined) details[""] = [...(details[""] ?? []), ...flattened.other]

  return apiErrorCreate(op, "platform.invalid-request", "Invalid request.", details)
}
