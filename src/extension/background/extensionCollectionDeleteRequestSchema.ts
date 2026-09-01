import * as v from "valibot"

export const extensionCollectionDeleteRequestSchema = v.strictObject({
  collectionId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  organizationId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
})

export type ExtensionCollectionDeleteRequest = v.InferOutput<typeof extensionCollectionDeleteRequestSchema>
