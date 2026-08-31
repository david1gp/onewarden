import * as v from "valibot"

const attachmentMultipartFileSchema = v.custom<File>((value): value is File => {
  if (typeof value !== "object" || value === null) return false
  const file = value as { arrayBuffer?: unknown }
  if (typeof file.arrayBuffer !== "function") return false
  if (typeof File !== "undefined" && value instanceof File) return true
  const tag = Object.prototype.toString.call(value)
  return tag === "[object Blob]" || tag === "[object File]"
}, "Attachment file is not provided.")

export const attachmentMultipartSchema = v.object({
  file: attachmentMultipartFileSchema,
  key: v.optional(v.string()),
})

export type AttachmentMultipart = v.InferOutput<typeof attachmentMultipartSchema>
