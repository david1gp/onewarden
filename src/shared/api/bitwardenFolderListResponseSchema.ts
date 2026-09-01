import * as v from "valibot"
import { bitwardenEncryptedFolderSchema } from "./bitwardenEncryptedFolderSchema.js"

export const bitwardenFolderListResponseSchema = v.looseObject({
  data: v.array(bitwardenEncryptedFolderSchema),
  object: v.literal("list"),
  continuationToken: v.nullish(v.string()),
})

export type BitwardenFolderListResponse = v.InferOutput<typeof bitwardenFolderListResponseSchema>
