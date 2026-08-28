import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultDemoData } from "./vaultDemoData.js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultWorkspaceProps {
  initialItems?: readonly VaultItem[]
  defaultSelectedId?: string
  defaultVault?: string
  defaultCategory?: string
  defaultFolder?: string | null
}

export function vaultWorkspaceStateCreate(props: VaultWorkspaceProps = {}) {
  const items = createSignalObject<readonly VaultItem[]>(props.initialItems ?? vaultDemoData)
  const selectedVault = createSignalObject(props.defaultVault ?? "all")
  const selectedCategory = createSignalObject(props.defaultCategory ?? "all")
  const selectedFolder = createSignalObject<string | null>(props.defaultFolder ?? null)
  const searchQuery = createSignalObject("")
  const selectedItemId = createSignalObject<string | null>(
    props.defaultSelectedId ?? (items.get().length > 0 ? (items.get()[0]?.id ?? null) : null),
  )
  const activeMobileTab = createSignalObject<"nav" | "list" | "detail">("list")

  const filteredItems = createMemo(() => {
    const list = items.get()
    const vault = selectedVault.get()
    const category = selectedCategory.get()
    const folder = selectedFolder.get()
    const query = searchQuery.get().trim().toLowerCase()

    return list.filter((item) => {
      if (vault !== "all" && item.vault !== vault) {
        return false
      }
      if (category === "favorites" && !item.favorite) {
        return false
      }
      if (category !== "all" && category !== "favorites" && item.category !== category) {
        return false
      }
      if (folder && item.folder !== folder) {
        return false
      }
      if (query.length > 0) {
        const matchesTitle = item.title.toLowerCase().includes(query)
        const matchesUsername = item.username?.toLowerCase().includes(query)
        const matchesUrl = item.url?.toLowerCase().includes(query)
        const matchesNotes = item.notes?.toLowerCase().includes(query)
        const matchesFolder = item.folder?.toLowerCase().includes(query)
        const matchesCustom = item.customFields?.some(
          (f) => f.label.toLowerCase().includes(query) || f.value.toLowerCase().includes(query),
        )
        if (!matchesTitle && !matchesUsername && !matchesUrl && !matchesNotes && !matchesFolder && !matchesCustom) {
          return false
        }
      }
      return true
    })
  })

  const selectedItem = createMemo(() => {
    const currentId = selectedItemId.get()
    if (!currentId) return null
    return filteredItems().find((i) => i.id === currentId) ?? null
  })

  const selectVault = (vault: string) => {
    selectedVault.set(vault)
    selectedCategory.set("all")
    selectedFolder.set(null)
    activeMobileTab.set("list")
  }

  const selectCategory = (category: string) => {
    selectedCategory.set(category)
    selectedFolder.set(null)
    activeMobileTab.set("list")
  }

  const selectFolder = (folder: string | null) => {
    selectedFolder.set(folder)
    activeMobileTab.set("list")
  }

  const selectItem = (id: string) => {
    selectedItemId.set(id)
    activeMobileTab.set("detail")
  }

  const setSearchQuery = (query: string) => {
    searchQuery.set(query)
  }

  const resetFilter = () => {
    selectedVault.set("all")
    selectedCategory.set("all")
    selectedFolder.set(null)
    searchQuery.set("")
  }

  const toggleFavorite = (id: string) => {
    const updated = items.get().map((i) => (i.id === id ? { ...i, favorite: !i.favorite } : i))
    items.set(updated)
  }

  return {
    items: items.get,
    filteredItems,
    selectedItem,
    selectedVault: selectedVault.get,
    selectedCategory: selectedCategory.get,
    selectedFolder: selectedFolder.get,
    searchQuery: searchQuery.get,
    selectedItemId: selectedItemId.get,
    activeMobileTab: activeMobileTab.get,
    setMobileTab: activeMobileTab.set,
    selectVault,
    selectCategory,
    selectFolder,
    selectItem,
    setSearchQuery,
    resetFilter,
    toggleFavorite,
  }
}
