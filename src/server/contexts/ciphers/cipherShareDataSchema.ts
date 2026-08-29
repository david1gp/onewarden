import * as v from "valibot"
import { collectionIdSchema } from "../organizations/collectionIdSchema.js"
import { cipherDataSchema } from "./cipherDataSchema.js"

const cipherShareCollectionIdsSchema = v.array(collectionIdSchema)

export const cipherShareDataSchema = v.object({
  Cipher: v.optional(cipherDataSchema),
  CollectionIds: v.optional(cipherShareCollectionIdsSchema),
  cipher: v.optional(cipherDataSchema),
  collectionIds: v.optional(cipherShareCollectionIdsSchema),
})

export type CipherShareData = v.InferOutput<typeof cipherShareDataSchema>
