import * as v from "valibot"
import { vaultItemCustomFieldSchema } from "./vaultItemCustomFieldSchema.js"

export const vaultItemSchema = v.object({
  id: v.string(),
  title: v.string(),
  category: v.picklist(["login", "secureNote", "creditCard", "identity", "password", "server", "sshKey"]),
  vault: v.picklist(["Personal", "Work", "Shared"]),
  favorite: v.boolean(),
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

export type VaultItem = v.InferOutput<typeof vaultItemSchema>
