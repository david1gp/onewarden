import * as v from "valibot"

export const organizationCreateInputSchema = v.object({
  billingEmail: v.pipe(v.string(), v.email("Valid email address is required")),
  collectionName: v.optional(v.string()),
  key: v.optional(v.string()),
  name: v.pipe(v.string(), v.minLength(1, "Organization name is required")),
  planType: v.optional(v.number()),
})

export type OrganizationCreateInput = v.InferOutput<typeof organizationCreateInputSchema>
