import * as v from "valibot"
import { bitwardenEncryptedCollectionSchema } from "./bitwardenEncryptedCollectionSchema.js"

export const bitwardenCollectionListResponseSchema = v.looseObject({
  data: v.array(bitwardenEncryptedCollectionSchema),
  object: v.literal("list"),
  continuationToken: v.nullish(v.string()),
})

export type BitwardenCollectionListResponse = v.InferOutput<typeof bitwardenCollectionListResponseSchema>
