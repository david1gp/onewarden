import * as v from "valibot"

export const cipherAttachmentSchema = v.object({
  id: v.string(),
  fileName: v.string(),
  key: v.optional(v.nullable(v.string())),
  size: v.optional(v.nullable(v.string())),
  sizeName: v.optional(v.nullable(v.string())),
  url: v.optional(v.nullable(v.string())),
})

export type CipherAttachment = v.InferOutput<typeof cipherAttachmentSchema>
