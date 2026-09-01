import * as v from "valibot"

export const extensionAttachmentDownloadResultSchema = v.strictObject({
  fileName: v.pipe(v.string(), v.minLength(1)),
  dataBase64: v.string(),
})

export type ExtensionAttachmentDownloadResult = v.InferOutput<typeof extensionAttachmentDownloadResultSchema>
