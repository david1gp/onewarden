import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function cipherWireDataParse(value: string | null): Result<Record<string, unknown> | null> {
  const op = "cipherWireDataParse"
  if (value === null) return resultCreate(null)
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return resultErrorCreate(op, "Cipher wire data is invalid.")
    return resultCreate(parsed as Record<string, unknown>)
  } catch {
    return resultErrorCreate(op, "Cipher wire data is invalid.")
  }
}
