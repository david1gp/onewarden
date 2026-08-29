import * as v from "valibot"

export const organizationPolicyPathSchema = v.object({
  pol_type: v.pipe(v.string(), v.transform(Number), v.integer()),
})

export type OrganizationPolicyPath = v.InferOutput<typeof organizationPolicyPathSchema>
