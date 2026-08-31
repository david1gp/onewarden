import * as v from "valibot"
import { organizationPolicySchema } from "./organizationPolicySchema.js"

export const organizationPolicyListResponseSchema = v.object({
  data: v.optional(v.nullable(v.array(organizationPolicySchema))),
})

export type OrganizationPolicyListResponse = v.InferOutput<typeof organizationPolicyListResponseSchema>
