import * as v from "valibot"
import { collectionIdSchema } from "../organizations/collectionIdSchema.js"
import { cipherDataSchema } from "./cipherDataSchema.js"

const cipherShareSelectedCollectionIdsSchema = v.array(collectionIdSchema)

export const cipherShareSelectedDataSchema = v.object({
  ciphers: v.optional(v.array(cipherDataSchema)),
  collectionIds: v.optional(cipherShareSelectedCollectionIdsSchema),
})

export type CipherShareSelectedData = v.InferOutput<typeof cipherShareSelectedDataSchema>
