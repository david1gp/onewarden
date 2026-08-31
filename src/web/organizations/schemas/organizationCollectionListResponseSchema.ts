import * as v from "valibot"
import { organizationCollectionSchema } from "./organizationCollectionSchema.js"

export const organizationCollectionListResponseSchema = v.object({
  data: v.optional(v.nullable(v.array(organizationCollectionSchema))),
})

export type OrganizationCollectionListResponse = v.InferOutput<typeof organizationCollectionListResponseSchema>
