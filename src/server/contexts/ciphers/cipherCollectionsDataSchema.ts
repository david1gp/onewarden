import * as v from "valibot"
import { collectionIdSchema } from "../organizations/collectionIdSchema.js"

const cipherCollectionIdsSchema = v.array(collectionIdSchema)

export const cipherCollectionsDataSchema = v.object({
  CollectionIds: v.optional(cipherCollectionIdsSchema),
  collectionIds: v.optional(cipherCollectionIdsSchema),
})

export type CipherCollectionsData = v.InferOutput<typeof cipherCollectionsDataSchema>
