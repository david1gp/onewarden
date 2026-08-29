import * as v from "valibot"
import { collectionIdSchema } from "./collectionIdSchema.js"
import { organizationCollectionAccessDataSchema } from "./organizationCollectionAccessDataSchema.js"

export const organizationCollectionBulkAccessDataSchema = v.object({
  collectionIds: v.array(collectionIdSchema),
  groups: v.array(organizationCollectionAccessDataSchema),
  users: v.array(organizationCollectionAccessDataSchema),
})

export type OrganizationCollectionBulkAccessData = v.InferOutput<typeof organizationCollectionBulkAccessDataSchema>
