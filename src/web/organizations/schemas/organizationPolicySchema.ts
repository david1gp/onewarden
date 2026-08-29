import * as v from "valibot"

export const organizationPolicySchema = v.object({
  canToggleState: v.optional(v.boolean()),
  data: v.optional(v.unknown()),
  enabled: v.boolean(),
  id: v.string(),
  organizationId: v.string(),
  revisionDate: v.optional(v.string()),
  type: v.number(),
})

export type OrganizationPolicy = v.InferOutput<typeof organizationPolicySchema>
