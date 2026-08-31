import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function twoFactorPersistedJsonParse<const TSchema extends v.GenericSchema>(
  op: string,
  data: string,
  schema: TSchema,
  errorMessage: string,
): Result<v.InferOutput<TSchema>> {
  let decoded: unknown
  try {
    decoded = JSON.parse(data)
  } catch {
    return resultErrorCreate(op, errorMessage)
  }
  const parsed = v.safeParse(schema, decoded)
  if (!parsed.success) return resultErrorCreate(op, errorMessage)
  return resultCreate(parsed.output)
}
