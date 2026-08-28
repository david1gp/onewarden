import { type Result } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"

function recordIs(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function cipherPasswordHistoryValidate(value: unknown, cipherIndex: number): Result<void> {
  if (!Array.isArray(value)) return resultCreate(undefined)
  for (const entry of value) {
    if (!recordIs(entry) || !Object.hasOwn(entry, "password") || typeof entry.password === "string") continue
    return apiErrorCreate("cipherPasswordHistoryValidate", "platform.invalid-request", "The model state is invalid.", {
      [`Ciphers[${cipherIndex}].Notes`]: ["The password history contains a `null` value. Only strings are allowed."],
    })
  }
  return resultCreate(undefined)
}
