import * as v from "valibot"
import { type Result } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { isoTimestampSchema } from "../../../shared/validation/isoTimestampSchema.js"

function recordIs(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function cipherPasswordHistoryValidate(value: unknown, cipherIndex: number): Result<void> {
  if (!Array.isArray(value)) return resultCreate(undefined)
  for (const [entryIndex, entry] of value.entries()) {
    if (!recordIs(entry)) continue
    if (Object.hasOwn(entry, "lastUsedDate") && !v.safeParse(isoTimestampSchema, entry.lastUsedDate).success)
      return apiErrorCreate(
        "cipherPasswordHistoryValidate",
        "platform.invalid-request",
        "The model state is invalid.",
        {
          [`Ciphers[${cipherIndex}].PasswordHistory[${entryIndex}].LastUsedDate`]: [
            "The password history contains an invalid `lastUsedDate`. A valid ISO-8601 timestamp is required.",
          ],
        },
      )
    if (!Object.hasOwn(entry, "password")) continue
    if (typeof entry.password !== "string")
      return apiErrorCreate(
        "cipherPasswordHistoryValidate",
        "platform.invalid-request",
        "The model state is invalid.",
        {
          [`Ciphers[${cipherIndex}].Notes`]: [
            "The password history contains a `null` value. Only strings are allowed.",
          ],
        },
      )
    if (!Object.hasOwn(entry, "lastUsedDate"))
      return apiErrorCreate(
        "cipherPasswordHistoryValidate",
        "platform.invalid-request",
        "The model state is invalid.",
        {
          [`Ciphers[${cipherIndex}].PasswordHistory[${entryIndex}].LastUsedDate`]: [
            "The password history contains an invalid `lastUsedDate`. A valid ISO-8601 timestamp is required.",
          ],
        },
      )
  }
  return resultCreate(undefined)
}
