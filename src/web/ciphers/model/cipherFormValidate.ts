import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type CipherFormData, cipherFormDataSchema } from "../schemas/cipherFormDataSchema.js"

export function cipherFormValidate(input: unknown): Result<CipherFormData> {
  const op = "cipherFormValidate"

  const parseResult = v.safeParse(cipherFormDataSchema, input)
  if (!parseResult.success) {
    const issues = parseResult.issues
    const message = issues[0]?.message ?? "Invalid cipher form data."
    return resultErrorCreate(op, message, { code: "cipher.invalid-form", statusCode: 400 })
  }

  const data = parseResult.output

  if (data.type === 3 && data.expMonth) {
    const monthNum = Number.parseInt(data.expMonth, 10)
    if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return resultErrorCreate(op, "Expiration month must be between 1 and 12.", {
        code: "cipher.invalid-card-month",
        statusCode: 400,
      })
    }
  }

  if (data.type === 4 && data.email && data.email.trim().length > 0) {
    if (!data.email.includes("@")) {
      return resultErrorCreate(op, "Invalid email address format.", {
        code: "cipher.invalid-email",
        statusCode: 400,
      })
    }
  }

  return resultCreate(data)
}
