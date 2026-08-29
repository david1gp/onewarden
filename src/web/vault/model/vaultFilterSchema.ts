import * as v from "valibot"
import { vaultItemCategorySchema } from "./vaultItemCategorySchema.js"

export const vaultFilterSchema = v.object({
  vault: v.optional(v.string(), "all"),
  category: v.optional(vaultItemCategorySchema, "all"),
  folder: v.optional(v.nullable(v.string()), null),
  collection: v.optional(v.nullable(v.string()), null),
  search: v.optional(v.string(), ""),
  selectedItemId: v.optional(v.nullable(v.string()), null),
  includeDeleted: v.optional(v.boolean(), false),
})

export type VaultFilter = v.InferOutput<typeof vaultFilterSchema>
