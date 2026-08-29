import * as v from "valibot"
import { organizationCollectionAccessSchema } from "./organizationCollectionAccessSchema.js"

export const organizationMemberUpdateInputSchema = v.object({
  accessAll: v.boolean(),
  collections: v.optional(v.array(organizationCollectionAccessSchema)),
  groups: v.optional(v.array(v.string())),
  type: v.number(),
})

export type OrganizationMemberUpdateInput = v.InferOutput<typeof organizationMemberUpdateInputSchema>
