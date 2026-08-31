import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

const cipherWireDataSchema = v.record(v.string(), v.unknown())

export function cipherWireDataParse(value: string | null): Result<Record<string, unknown> | null> {
  const op = "cipherWireDataParse"
  if (value === null) return resultCreate(null)
  try {
    const parsed = v.safeParse(cipherWireDataSchema, JSON.parse(value))
    if (!parsed.success) return resultErrorCreate(op, "Cipher wire data is invalid.")
    return resultCreate(parsed.output)
  } catch {
    return resultErrorCreate(op, "Cipher wire data is invalid.")
  }
}
