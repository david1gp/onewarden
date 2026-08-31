import * as v from "valibot"
import { organizationGroupSchema } from "./organizationGroupSchema.js"

export const organizationGroupListResponseSchema = v.object({
  data: v.optional(v.nullable(v.array(organizationGroupSchema))),
})

export type OrganizationGroupListResponse = v.InferOutput<typeof organizationGroupListResponseSchema>
