import * as v from "valibot"

const cipherBulkCollectionsIdsSchema = v.array(v.string())

export const cipherBulkCollectionsDataSchema = v.object({
  cipherIds: cipherBulkCollectionsIdsSchema,
  collectionIds: cipherBulkCollectionsIdsSchema,
  organizationId: v.string(),
  removeCollections: v.boolean(),
})

export type CipherBulkCollectionsData = v.InferOutput<typeof cipherBulkCollectionsDataSchema>
