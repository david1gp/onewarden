import * as v from "valibot"

export const vaultFolderSchema = v.object({
  id: v.string(),
  name: v.string(),
  revisionDate: v.optional(v.string()),
  object: v.optional(v.literal("folder")),
})

export type VaultFolder = v.InferOutput<typeof vaultFolderSchema>
