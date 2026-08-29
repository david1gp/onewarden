import type { VaultFilter } from "./vaultFilterSchema.js"
import type { VaultItem } from "./vaultItemSchema.js"

export function vaultFilterApply(items: readonly VaultItem[], filter: Partial<VaultFilter>): readonly VaultItem[] {
  const vault = filter.vault ?? "all"
  const category = filter.category ?? "all"
  const folder = filter.folder ?? null
  const collection = filter.collection ?? null
  const query = (filter.search ?? "").trim().toLowerCase()
  const includeDeleted = filter.includeDeleted ?? false

  return items.filter((item) => {
    const deletedAt = item.deletedDate ?? item.deletedAt ?? null
    if (!includeDeleted) {
      if (category === "trash") {
        if (!deletedAt) return false
      } else if (deletedAt) {
        return false
      }
    }

    if (vault !== "all" && item.vault !== vault) {
      return false
    }

    if (category === "favorites" && ((item.ownership ?? "personal") !== "personal" || !item.favorite)) {
      return false
    }

    if (category !== "all" && category !== "favorites" && category !== "trash" && item.category !== category) {
      return false
    }

    if (folder !== null && item.folder !== folder && item.folderId !== folder) {
      return false
    }

    if (collection !== null && !item.collectionIds?.includes(collection)) {
      return false
    }

    if (query.length > 0) {
      const matchesTitle = item.title.toLowerCase().includes(query)
      const matchesUsername = item.username?.toLowerCase().includes(query) ?? false
      const matchesUrl = item.url?.toLowerCase().includes(query) ?? false
      const matchesNotes = item.notes?.toLowerCase().includes(query) ?? false
      const matchesFolder = item.folder?.toLowerCase().includes(query) ?? false
      const matchesCustom =
        item.customFields?.some(
          (field) => field.label.toLowerCase().includes(query) || field.value.toLowerCase().includes(query),
        ) ?? false

      if (!matchesTitle && !matchesUsername && !matchesUrl && !matchesNotes && !matchesFolder && !matchesCustom) {
        return false
      }
    }

    return true
  })
}
