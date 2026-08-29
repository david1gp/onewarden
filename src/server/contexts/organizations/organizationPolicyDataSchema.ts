import * as v from "valibot"

export const organizationPolicyDataSchema = v.object({
  enabled: v.boolean(),
  data: v.optional(v.unknown()),
})

export type OrganizationPolicyData = v.InferOutput<typeof organizationPolicyDataSchema>
