import * as v from "valibot"
import { extensionFolderSchema } from "../crypto/extensionFolderSchema.js"

export const extensionFolderUpdateRequestSchema = v.strictObject({
  folderId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  folder: extensionFolderSchema,
})

export type ExtensionFolderUpdateRequest = v.InferOutput<typeof extensionFolderUpdateRequestSchema>
