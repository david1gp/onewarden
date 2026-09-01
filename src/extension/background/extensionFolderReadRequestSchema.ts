import * as v from "valibot"

export const extensionFolderReadRequestSchema = v.strictObject({
  folderId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
})

export type ExtensionFolderReadRequest = v.InferOutput<typeof extensionFolderReadRequestSchema>
