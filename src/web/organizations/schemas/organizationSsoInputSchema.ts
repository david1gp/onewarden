import * as v from "valibot"

export const organizationSsoInputSchema = v.object({
  data: v.record(v.string(), v.unknown()),
  enabled: v.boolean(),
  identifier: v.optional(v.nullable(v.string())),
})

export type OrganizationSsoInput = v.InferOutput<typeof organizationSsoInputSchema>
