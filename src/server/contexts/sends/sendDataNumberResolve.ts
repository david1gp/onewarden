import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function sendDataNumberResolve(
  value: number | string | null | undefined,
  allowNegative = false,
): Result<number | null> {
  const op = "sendDataNumberResolve"
  if (value === undefined || value === null) return resultCreate(null)
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isSafeInteger(number) || (!allowNegative && number < 0))
    return resultErrorCreate(op, "Send numeric data is invalid.")
  return resultCreate(number)
}
