import * as v from "valibot"
import { bitwardenCollectionAccessSchema } from "../../shared/api/bitwardenCollectionAccessSchema.js"
import { extensionCollectionSchema } from "../crypto/extensionCollectionSchema.js"

export const extensionCollectionUpdateRequestSchema = v.strictObject({
  collection: extensionCollectionSchema,
  collectionId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  groups: v.optional(v.array(bitwardenCollectionAccessSchema), []),
  organizationId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  users: v.optional(v.array(bitwardenCollectionAccessSchema), []),
})

export type ExtensionCollectionUpdateRequest = v.InferOutput<typeof extensionCollectionUpdateRequestSchema>
