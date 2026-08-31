import * as v from "valibot"
import { organizationMemberSchema } from "./organizationMemberSchema.js"

export const organizationMemberListResponseSchema = v.object({
  data: v.optional(v.nullable(v.array(organizationMemberSchema))),
})

export type OrganizationMemberListResponse = v.InferOutput<typeof organizationMemberListResponseSchema>
