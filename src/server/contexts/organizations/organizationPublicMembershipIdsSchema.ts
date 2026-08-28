import * as v from "valibot"

export const organizationPublicMembershipIdsSchema = v.object({
  ids: v.array(v.string()),
})

export type OrganizationPublicMembershipIds = v.InferOutput<typeof organizationPublicMembershipIdsSchema>
