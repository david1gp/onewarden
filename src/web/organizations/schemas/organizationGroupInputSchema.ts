import * as v from "valibot"
import { organizationCollectionAccessSchema } from "./organizationCollectionAccessSchema.js"

export const organizationGroupInputSchema = v.object({
  accessAll: v.optional(v.boolean()),
  collections: v.optional(v.array(organizationCollectionAccessSchema)),
  externalId: v.optional(v.nullable(v.string())),
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "Group name is required")),
  users: v.optional(v.array(v.string())),
})

export type OrganizationGroupInput = v.InferOutput<typeof organizationGroupInputSchema>
