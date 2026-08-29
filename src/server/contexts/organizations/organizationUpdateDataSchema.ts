import * as v from "valibot"

export const organizationUpdateDataSchema = v.object({
  billingEmail: v.string(),
  name: v.string(),
})

export type OrganizationUpdateData = v.InferOutput<typeof organizationUpdateDataSchema>
