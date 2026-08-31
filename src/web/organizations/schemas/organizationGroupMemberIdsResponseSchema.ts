import * as v from "valibot"

export const organizationGroupMemberIdsResponseSchema = v.array(v.string())

export type OrganizationGroupMemberIdsResponse = v.InferOutput<typeof organizationGroupMemberIdsResponseSchema>
