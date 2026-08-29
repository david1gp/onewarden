import * as v from "valibot"

export const organizationUpdateInputSchema = v.object({
  billingEmail: v.pipe(v.string(), v.email("Valid email address is required")),
  name: v.pipe(v.string(), v.minLength(1, "Organization name is required")),
})

export type OrganizationUpdateInput = v.InferOutput<typeof organizationUpdateInputSchema>
