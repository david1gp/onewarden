import * as v from "valibot"
import { bitwardenEncryptedLoginCipherSchema } from "./bitwardenEncryptedLoginCipherSchema.js"

export const bitwardenEncryptedLoginCipherListResponseSchema = v.looseObject({
  data: v.array(bitwardenEncryptedLoginCipherSchema),
  object: v.literal("list"),
  continuationToken: v.nullish(v.string()),
})

export type BitwardenEncryptedLoginCipherListResponse = v.InferOutput<
  typeof bitwardenEncryptedLoginCipherListResponseSchema
>
