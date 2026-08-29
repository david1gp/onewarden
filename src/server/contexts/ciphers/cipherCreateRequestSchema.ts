import * as v from "valibot"
import { collectionIdSchema } from "../organizations/collectionIdSchema.js"
import { cipherDataSchema } from "./cipherDataSchema.js"

const cipherCreateWrappedRequestSchema = v.object({
  Cipher: v.optional(cipherDataSchema),
  CollectionIds: v.optional(v.array(collectionIdSchema)),
  cipher: v.optional(cipherDataSchema),
  collectionIds: v.optional(v.array(collectionIdSchema)),
})

export const cipherCreateRequestSchema = v.union([cipherDataSchema, cipherCreateWrappedRequestSchema])

export type CipherCreateRequest = v.InferOutput<typeof cipherCreateRequestSchema>
