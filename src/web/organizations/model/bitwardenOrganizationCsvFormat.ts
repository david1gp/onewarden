import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { BitwardenCsvRecord } from "../../settings/model/bitwardenCsvFormat.js"
import { bitwardenCsvFormat } from "../../settings/model/bitwardenCsvFormat.js"
import {
  type BitwardenOrganizationCsvRecord,
  bitwardenOrganizationCsvRecordSchema,
} from "./bitwardenOrganizationCsvRecordSchema.js"

export function bitwardenOrganizationCsvFormat(records: BitwardenOrganizationCsvRecord[]): Result<string> {
  const op = "bitwardenOrganizationCsvFormat"
  const validated = v.safeParse(v.array(bitwardenOrganizationCsvRecordSchema), records)
  if (!validated.success)
    return resultErrorCreate(op, `Invalid Bitwarden organization CSV data: ${v.summarize(validated.issues)}`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const personalRecords: BitwardenCsvRecord[] = validated.output.map((record) => ({
    folder: record.collections.join(", "),
    favorite: record.favorite,
    type: record.type,
    name: record.name,
    notes: record.notes,
    fields: record.fields,
    reprompt: record.reprompt,
    login_uri: record.login_uri,
    login_username: record.login_username,
    login_password: record.login_password,
    login_totp: record.login_totp,
  }))
  return resultCreate(bitwardenCsvFormat(personalRecords).replace("folder,", "collections,"))
}
