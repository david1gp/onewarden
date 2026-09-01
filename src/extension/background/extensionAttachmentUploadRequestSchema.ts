import * as v from "valibot"

export const extensionAttachmentUploadRequestSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  fileName: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
  dataBase64: v.string(),
})

export type ExtensionAttachmentUploadRequest = v.InferOutput<typeof extensionAttachmentUploadRequestSchema>
