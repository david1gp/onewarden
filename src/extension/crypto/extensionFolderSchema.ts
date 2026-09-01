import * as v from "valibot"

export const extensionFolderSchema = v.looseObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  revisionDate: v.optional(v.string()),
  object: v.optional(v.literal("folder")),
})

export type ExtensionFolder = v.InferOutput<typeof extensionFolderSchema>
