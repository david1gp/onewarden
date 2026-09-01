import * as v from "valibot"

export const extensionFolderDeleteRequestSchema = v.strictObject({
  folderId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
})

export type ExtensionFolderDeleteRequest = v.InferOutput<typeof extensionFolderDeleteRequestSchema>
