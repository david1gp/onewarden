import * as v from "valibot"
import { vaultItemCustomFieldSchema } from "./vaultItemCustomFieldSchema.js"

const vaultItemDataSchema = v.object({
  id: v.string(),
  title: v.string(),
  category: v.picklist(["login", "secureNote", "creditCard", "identity", "sshKey"]),
  ownership: v.picklist(["personal", "organization"]),
  organizationId: v.nullable(v.string()),
  collectionIds: v.array(v.string()),
  folderId: v.nullable(v.string()),
  favorite: v.boolean(),
  deletedAt: v.optional(v.nullable(v.string()), null),
  vault: v.optional(v.picklist(["Personal", "Work", "Shared"])),
  folder: v.optional(v.nullable(v.string())),
  username: v.optional(v.string()),
  password: v.optional(v.string()),
  url: v.optional(v.string()),
  totp: v.optional(v.string()),
  notes: v.optional(v.string()),
  customFields: v.optional(v.array(vaultItemCustomFieldSchema)),
  createdAt: v.string(),
  updatedAt: v.string(),
  passwordStrength: v.optional(v.picklist(["Weak", "Medium", "Strong", "Very Strong"])),
  securityAlert: v.optional(v.string()),
})

function vaultItemMetadataIsValid(item: v.InferOutput<typeof vaultItemDataSchema>): boolean {
  if (item.ownership === "personal") {
    return item.organizationId === null && item.collectionIds.length === 0
  }

  return item.organizationId !== null && item.collectionIds.length > 0 && !item.favorite
}

export const vaultItemSchema = v.pipe(
  vaultItemDataSchema,
  v.check(vaultItemMetadataIsValid, "Vault item ownership metadata is invalid."),
)

export type VaultItem = v.InferOutput<typeof vaultItemSchema>
