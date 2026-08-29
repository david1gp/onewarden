import * as v from "valibot"

export const organizationSsoSchema = v.object({
  Data: v.optional(v.nullable(v.record(v.string(), v.unknown()))),
  Enabled: v.boolean(),
  Identifier: v.optional(v.nullable(v.string())),
  Urls: v.optional(v.nullable(v.record(v.string(), v.string()))),
})

export type OrganizationSso = v.InferOutput<typeof organizationSsoSchema>
