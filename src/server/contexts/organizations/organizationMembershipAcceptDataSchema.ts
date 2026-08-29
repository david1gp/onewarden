import * as v from "valibot"

export const organizationMembershipAcceptDataSchema = v.object({
  resetPasswordKey: v.nullish(v.string()),
  token: v.string(),
})

export type OrganizationMembershipAcceptData = v.InferOutput<typeof organizationMembershipAcceptDataSchema>
