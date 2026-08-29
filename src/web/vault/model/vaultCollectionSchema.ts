import * as v from "valibot"

export const vaultCollectionSchema = v.object({
  id: v.string(),
  organizationId: v.string(),
  name: v.string(),
  externalId: v.optional(v.nullable(v.string())),
  hidePasswords: v.optional(v.boolean()),
  readOnly: v.optional(v.boolean()),
  object: v.optional(v.literal("collection")),
})

export type VaultCollection = v.InferOutput<typeof vaultCollectionSchema>
