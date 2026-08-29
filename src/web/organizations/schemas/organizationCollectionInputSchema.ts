import * as v from "valibot"
import { organizationCollectionAccessSchema } from "./organizationCollectionAccessSchema.js"

export const organizationCollectionInputSchema = v.object({
  externalId: v.optional(v.nullable(v.string())),
  groups: v.optional(v.array(organizationCollectionAccessSchema)),
  name: v.pipe(v.string(), v.minLength(1, "Collection name is required")),
  users: v.optional(v.array(organizationCollectionAccessSchema)),
})

export type OrganizationCollectionInput = v.InferOutput<typeof organizationCollectionInputSchema>
