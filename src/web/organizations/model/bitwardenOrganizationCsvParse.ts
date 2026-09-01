import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { bitwardenCsvFieldsParse } from "../../settings/model/bitwardenCsvFieldsParse.js"
import { bitwardenCsvParse } from "../../settings/model/bitwardenCsvParse.js"
import {
  type BitwardenOrganizationCsvRecord,
  bitwardenOrganizationCsvRecordSchema,
} from "./bitwardenOrganizationCsvRecordSchema.js"

function organizationCsvCollectionsParse(value: string | null | undefined): string[] | null {
  if (value === null || value === undefined || value.trim().length === 0) return null
  const collections = value.split(",").map((collection) => collection.trim())
  if (collections.some((collection) => collection.length === 0)) return null
  if (new Set(collections).size !== collections.length) return null
  return collections
}

export function bitwardenOrganizationCsvParse(csvText: string): Result<BitwardenOrganizationCsvRecord[]> {
  const op = "bitwardenOrganizationCsvParse"
  if (typeof csvText !== "string")
    return resultErrorCreate(op, "Invalid Bitwarden organization CSV: content must be text.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const text = csvText.startsWith("\uFEFF") ? csvText.slice(1) : csvText
  const personalCsv = text.startsWith("collections,") ? `folder,${text.slice("collections,".length)}` : text
  const parsed = bitwardenCsvParse(personalCsv)
  if (!parsed.success)
    return resultErrorCreate(op, `Invalid Bitwarden organization CSV: ${parsed.errorMessage}`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const records: BitwardenOrganizationCsvRecord[] = []
  for (const [index, record] of parsed.data.entries()) {
    const collections = organizationCsvCollectionsParse(record.folder)
    if (collections === null)
      return resultErrorCreate(op, `Invalid Bitwarden organization CSV: row ${index + 2} must reference collections.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })

    const fieldsText =
      typeof record.fields === "string" || record.fields === null || record.fields === undefined ? record.fields : null
    const fieldsResult = bitwardenCsvFieldsParse(fieldsText)
    if (!fieldsResult.success)
      return resultErrorCreate(op, `Invalid Bitwarden organization CSV: ${fieldsResult.errorMessage}`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })

    const organizationRecord = {
      collections,
      favorite: record.favorite,
      type: record.type === "login" ? "login" : "note",
      name: record.name,
      notes: record.notes,
      fields: fieldsText,
      reprompt: record.reprompt,
      login_uri: record.login_uri,
      login_username: record.login_username,
      login_password: record.login_password,
      login_totp: record.login_totp,
    }
    const validated = v.safeParse(bitwardenOrganizationCsvRecordSchema, organizationRecord)
    if (!validated.success)
      return resultErrorCreate(op, `Invalid Bitwarden organization CSV: ${v.summarize(validated.issues)}`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    records.push(validated.output)
  }

  return resultCreate(records)
}
