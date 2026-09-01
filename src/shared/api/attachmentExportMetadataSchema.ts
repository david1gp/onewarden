import * as v from "valibot"

export const attachmentExportMetadataSchema = v.strictObject({
  fileName: v.string(),
  id: v.pipe(v.string(), v.minLength(1)),
  key: v.nullable(v.string()),
  object: v.literal("attachment"),
  size: v.pipe(v.string(), v.regex(/^\d+$/)),
})

export type AttachmentExportMetadata = v.InferOutput<typeof attachmentExportMetadataSchema>
