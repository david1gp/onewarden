import * as v from "valibot"

export const folderDataSchema = v.object({
  id: v.optional(v.nullable(v.string())),
  name: v.string(),
})

export type FolderData = v.InferOutput<typeof folderDataSchema>
