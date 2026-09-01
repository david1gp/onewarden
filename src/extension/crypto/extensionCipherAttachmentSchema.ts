import * as v from "valibot"

export const extensionCipherAttachmentSchema = v.looseObject({
  id: v.pipe(v.string(), v.minLength(1)),
  fileName: v.pipe(v.string(), v.minLength(1)),
  key: v.optional(v.nullable(v.string())),
  size: v.optional(v.nullable(v.string())),
  sizeName: v.optional(v.nullable(v.string())),
  url: v.optional(v.nullable(v.string())),
  object: v.optional(v.literal("attachment")),
})

export type ExtensionCipherAttachment = v.InferOutput<typeof extensionCipherAttachmentSchema>
