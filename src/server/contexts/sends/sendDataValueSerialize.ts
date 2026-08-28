import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function sendDataValueSerialize(value: unknown): Result<string> {
  const op = "sendDataValueSerialize"
  if (value === undefined || value === null) return resultErrorCreate(op, "Send data not provided.")
  const sanitized = sendDataValueResponseRemove(value)
  try {
    const serialized = JSON.stringify(sanitized)
    if (serialized === undefined) return resultErrorCreate(op, "Send data not provided.")
    return resultCreate(serialized)
  } catch {
    return resultErrorCreate(op, "Send data could not be serialized.")
  }
}

function sendDataValueResponseRemove(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value
  const copy = { ...(value as Record<string, unknown>) }
  delete copy.response
  delete copy.Response
  return copy
}
