import * as v from "valibot"

export const organizationSsoRequestSchema = v.object({
  enabled: v.boolean(),
  identifier: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(50))), ""),
  data: v.record(v.string(), v.unknown()),
})

export type OrganizationSsoRequest = v.InferOutput<typeof organizationSsoRequestSchema>
