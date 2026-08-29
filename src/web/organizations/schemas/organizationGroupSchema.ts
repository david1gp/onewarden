import * as v from "valibot"
import { organizationCollectionAccessSchema } from "./organizationCollectionAccessSchema.js"

export const organizationGroupSchema = v.object({
  accessAll: v.optional(v.boolean()),
  collections: v.optional(v.array(organizationCollectionAccessSchema)),
  externalId: v.optional(v.nullable(v.string())),
  id: v.string(),
  name: v.string(),
  organizationId: v.string(),
  users: v.optional(v.array(v.string())),
})

export type OrganizationGroup = v.InferOutput<typeof organizationGroupSchema>
