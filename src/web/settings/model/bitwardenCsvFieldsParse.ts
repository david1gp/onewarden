import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function bitwardenCsvFieldsParse(
  fieldsText: string | null | undefined,
): Result<Array<{ name: string; value: string; type: 0; linkedId: null }>> {
  const op = "bitwardenCsvFieldsParse"
  if (fieldsText === null || fieldsText === undefined || fieldsText === "") return resultCreate([])
  if (typeof fieldsText !== "string") {
    return resultErrorCreate(op, "Invalid Bitwarden CSV fields: content must be text.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const fields: Array<{ name: string; value: string; type: 0; linkedId: null }> = []
  if (/\r(?!\n)/.test(fieldsText)) {
    return resultErrorCreate(op, "Invalid Bitwarden CSV fields: use CRLF or LF line endings.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  for (const fieldText of fieldsText.split(/\r\n|\n/)) {
    const field = fieldText.trim()
    const separatorIndex = field.indexOf(":")
    if (field.length === 0 || separatorIndex < 0) {
      return resultErrorCreate(op, "Invalid Bitwarden CSV fields: each field must use 'name: value' text.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    fields.push({
      name: field.slice(0, separatorIndex).trim(),
      value: field.slice(separatorIndex + 1).trim(),
      type: 0,
      linkedId: null,
    })
  }

  return resultCreate(fields)
}
