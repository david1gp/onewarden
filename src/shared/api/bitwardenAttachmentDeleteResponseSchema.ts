import * as v from "valibot"
import { bitwardenEncryptedCipherSchema } from "./bitwardenEncryptedCipherSchema.js"

export const bitwardenAttachmentDeleteResponseSchema = v.strictObject({
  cipher: bitwardenEncryptedCipherSchema,
})

export type BitwardenAttachmentDeleteResponse = v.InferOutput<typeof bitwardenAttachmentDeleteResponseSchema>
