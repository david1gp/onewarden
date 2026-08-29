import type { VaultCollection } from "./vaultCollectionSchema.js"
import type { VaultFolder } from "./vaultFolderSchema.js"
import type { VaultItemCategory } from "./vaultItemCategorySchema.js"
import type { VaultItemCustomField } from "./vaultItemCustomFieldSchema.js"
import type { VaultItem } from "./vaultItemSchema.js"
import type { VaultSyncResponse } from "./vaultSyncResponseSchema.js"

export interface VaultMappedSyncData {
  items: readonly VaultItem[]
  folders: readonly VaultFolder[]
  collections: readonly VaultCollection[]
  profile: {
    id: string
    name: string
    email: string
  }
}

export function vaultSyncModelMap(sync: VaultSyncResponse): VaultMappedSyncData {
  const folders = sync.folders ?? []
  const collections = sync.collections ?? []
  const folderMap = new Map<string, string>()
  for (const f of folders) {
    folderMap.set(f.id, f.name)
  }

  const orgMap = new Map<string, string>()
  for (const org of sync.profile.organizations ?? []) {
    orgMap.set(org.id, org.name)
  }

  const items: VaultItem[] = []
  for (const cipher of sync.ciphers ?? []) {
    let category: VaultItemCategory = "login"
    if (cipher.type === 2) category = "secureNote"
    else if (cipher.type === 3) category = "creditCard"
    else if (cipher.type === 4) category = "identity"
    else if (cipher.type === 5) category = "sshKey"

    const vaultName = cipher.organizationId ? (orgMap.get(cipher.organizationId) ?? "Organization") : "Personal"
    const folderName = cipher.folderId ? (folderMap.get(cipher.folderId) ?? null) : null

    const customFields: VaultItemCustomField[] = []
    if (cipher.fields && Array.isArray(cipher.fields)) {
      for (const field of cipher.fields) {
        if (field.name !== null && field.name !== undefined) {
          customFields.push({
            label: field.name,
            value: field.value ?? "",
            concealed: field.type === 1,
          })
        }
      }
    }

    let url: string | undefined
    if (cipher.login?.uris && cipher.login.uris.length > 0 && cipher.login.uris[0]?.uri) {
      url = cipher.login.uris[0].uri
    } else if (cipher.login?.uri) {
      url = cipher.login.uri
    }

    const item: VaultItem = {
      id: cipher.id,
      title: cipher.name,
      category,
      vault: vaultName,
      ownership: cipher.organizationId ? "organization" : "personal",
      organizationId: cipher.organizationId ?? null,
      favorite: Boolean(cipher.favorite),
      folder: folderName,
      folderId: cipher.folderId ?? null,
      collectionIds: cipher.collectionIds ?? [],
      username: cipher.login?.username ?? undefined,
      password: cipher.login?.password ?? undefined,
      url,
      totp: cipher.login?.totp ?? undefined,
      notes: cipher.notes ?? undefined,
      customFields: customFields.length > 0 ? customFields : undefined,
      createdAt: cipher.creationDate ?? cipher.revisionDate ?? new Date().toISOString(),
      updatedAt: cipher.revisionDate ?? new Date().toISOString(),
      deletedAt: cipher.deletedDate ?? null,
      deletedDate: cipher.deletedDate ?? null,
    }

    items.push(item)
  }

  return {
    items,
    folders,
    collections,
    profile: {
      id: sync.profile.id,
      name: sync.profile.name ?? sync.profile.email.split("@")[0] ?? "Vault User",
      email: sync.profile.email,
    },
  }
}
