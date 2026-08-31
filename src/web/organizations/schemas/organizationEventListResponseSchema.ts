import * as v from "valibot"
import { organizationEventSchema } from "./organizationEventSchema.js"

export const organizationEventListResponseSchema = v.object({
  continuationToken: v.optional(v.nullable(v.string())),
  data: v.optional(v.nullable(v.array(organizationEventSchema))),
})

export type OrganizationEventListResponse = v.InferOutput<typeof organizationEventListResponseSchema>
