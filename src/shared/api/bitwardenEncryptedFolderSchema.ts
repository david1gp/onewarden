import * as v from "valibot"

export const bitwardenEncryptedFolderSchema = v.looseObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  revisionDate: v.optional(v.string()),
  object: v.optional(v.literal("folder")),
})

export type BitwardenEncryptedFolder = v.InferOutput<typeof bitwardenEncryptedFolderSchema>
