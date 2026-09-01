import * as v from "valibot"

const bitwardenOrganizationCsvFieldSchema = v.object({
  name: v.optional(v.nullable(v.string())),
  value: v.optional(v.nullable(v.string())),
})

export const bitwardenOrganizationCsvRecordSchema = v.pipe(
  v.object({
    collections: v.pipe(v.array(v.pipe(v.string(), v.minLength(1))), v.minLength(1)),
    favorite: v.optional(v.nullable(v.boolean())),
    type: v.picklist(["login", "note"]),
    name: v.pipe(v.string(), v.minLength(1)),
    notes: v.optional(v.nullable(v.string())),
    fields: v.optional(v.nullable(v.union([v.string(), v.array(bitwardenOrganizationCsvFieldSchema)]))),
    reprompt: v.optional(v.nullable(v.picklist([0, 1]))),
    login_uri: v.optional(v.nullable(v.string())),
    login_username: v.optional(v.nullable(v.string())),
    login_password: v.optional(v.nullable(v.string())),
    login_totp: v.optional(v.nullable(v.string())),
  }),
  v.check(
    (record) =>
      record.type === "login" ||
      [record.login_uri, record.login_username, record.login_password, record.login_totp].every(
        (value) => value === undefined || value === null || value === "",
      ),
    "Organization CSV note records must not contain login data.",
  ),
)

export type BitwardenOrganizationCsvRecord = v.InferOutput<typeof bitwardenOrganizationCsvRecordSchema>
