import * as v from "valibot"

export const extensionAttachmentDeleteRequestSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  attachmentId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
})

export type ExtensionAttachmentDeleteRequest = v.InferOutput<typeof extensionAttachmentDeleteRequestSchema>
