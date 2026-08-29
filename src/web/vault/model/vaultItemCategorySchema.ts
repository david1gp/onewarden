import * as v from "valibot"

export const vaultItemCategorySchema = v.picklist([
  "all",
  "favorites",
  "trash",
  "login",
  "secureNote",
  "creditCard",
  "identity",
  "password",
  "server",
  "sshKey",
])

export type VaultItemCategory = v.InferOutput<typeof vaultItemCategorySchema>
