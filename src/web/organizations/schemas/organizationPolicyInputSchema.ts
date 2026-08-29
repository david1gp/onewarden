import * as v from "valibot"

export const organizationPolicyInputSchema = v.object({
  data: v.optional(v.unknown()),
  enabled: v.boolean(),
})

export type OrganizationPolicyInput = v.InferOutput<typeof organizationPolicyInputSchema>
