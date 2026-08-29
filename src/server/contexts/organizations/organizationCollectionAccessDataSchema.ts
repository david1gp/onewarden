import * as v from "valibot"
import { collectionIdSchema } from "./collectionIdSchema.js"

export const organizationCollectionAccessDataSchema = v.object({
  hidePasswords: v.boolean(),
  id: collectionIdSchema,
  manage: v.boolean(),
  readOnly: v.boolean(),
})

export type OrganizationCollectionAccessData = v.InferOutput<typeof organizationCollectionAccessDataSchema>
