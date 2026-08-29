import * as v from "valibot"
import { vaultItemCustomFieldSchema } from "./vaultItemCustomFieldSchema.js"

const vaultStoredItemCategorySchema = v.picklist(["login", "secureNote", "creditCard", "identity", "sshKey"])

const vaultItemDataSchema = v.object({
  id: v.string(),
  title: v.string(),
  category: vaultStoredItemCategorySchema,
  vault: v.optional(v.string()),
  favorite: v.boolean(),
  ownership: v.optional(v.picklist(["personal", "organization"])),
  organizationId: v.optional(v.nullable(v.string())),
  folder: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  collectionIds: v.optional(v.array(v.string())),
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
  deletedAt: v.optional(v.nullable(v.string())),
  deletedDate: v.optional(v.nullable(v.string())),
})

export const vaultItemSchema = v.pipe(
  vaultItemDataSchema,
  v.check((item) => {
    if (item.ownership === undefined) return true
    if (item.ownership === "personal") {
      return item.organizationId === null && (item.collectionIds?.length ?? 0) === 0
    }
    return item.organizationId !== null && (item.collectionIds?.length ?? 0) > 0
  }, "Vault item ownership metadata is invalid."),
)

export type VaultItem = v.InferOutput<typeof vaultItemSchema>
