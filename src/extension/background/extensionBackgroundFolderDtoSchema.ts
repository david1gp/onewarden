import * as v from "valibot"

export const extensionBackgroundFolderDtoSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  revisionDate: v.optional(v.string()),
  object: v.optional(v.literal("folder")),
})

export type ExtensionBackgroundFolderDto = v.InferOutput<typeof extensionBackgroundFolderDtoSchema>
