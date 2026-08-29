import * as v from "valibot"
import { collectionIdSchema } from "./collectionIdSchema.js"
import { organizationCollectionAccessDataSchema } from "./organizationCollectionAccessDataSchema.js"

export const organizationCollectionDataSchema = v.object({
  externalId: v.optional(v.nullable(v.string())),
  groups: v.array(organizationCollectionAccessDataSchema),
  id: v.optional(v.nullable(collectionIdSchema)),
  name: v.string(),
  users: v.array(organizationCollectionAccessDataSchema),
})

export type OrganizationCollectionData = v.InferOutput<typeof organizationCollectionDataSchema>
