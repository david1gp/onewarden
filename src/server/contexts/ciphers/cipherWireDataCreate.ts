import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function cipherWireDataCreate(value: Record<string, unknown>): Result<string> {
  const op = "cipherWireDataCreate"
  try {
    return resultCreate(JSON.stringify(value))
  } catch {
    return resultErrorCreate(op, "Cipher wire data could not be stored.")
  }
}
