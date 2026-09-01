import * as v from "valibot"
import { bitwardenEncryptedCipherSchema } from "./bitwardenEncryptedCipherSchema.js"

export const bitwardenEncryptedCipherListResponseSchema = v.looseObject({
  data: v.array(bitwardenEncryptedCipherSchema),
  object: v.literal("list"),
  continuationToken: v.nullish(v.string()),
})

export type BitwardenEncryptedCipherListResponse = v.InferOutput<typeof bitwardenEncryptedCipherListResponseSchema>
