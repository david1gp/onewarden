import * as v from "valibot"

export const vaultItemCustomFieldSchema = v.object({
  label: v.string(),
  value: v.string(),
  concealed: v.optional(v.boolean()),
})

export type VaultItemCustomField = v.InferOutput<typeof vaultItemCustomFieldSchema>
