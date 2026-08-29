import { createMemo } from "solid-js"
import { vaultCategoryIconResolve } from "./vaultCategoryIconResolve.js"
import { vaultCategoryThemeResolve } from "./vaultCategoryThemeResolve.js"
import { vaultCategoryTitleResolve } from "./vaultCategoryTitleResolve.js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultEntryListStateProps {
  items: () => readonly VaultItem[]
  selectedItemId: () => string | null
  searchQuery: () => string
  selectedCategory: () => string
  selectedVault: () => string
  selectedFolder: () => string | null
  onSelectItem: (id: string) => void
  onSearchChange: (query: string) => void
  onResetFilter: () => void
}

export function vaultEntryListStateCreate(props: VaultEntryListStateProps) {
  const filterTitle = createMemo(() => {
    if (props.selectedFolder()) {
      return props.selectedFolder() ?? "Folders"
    }
    if (props.selectedCategory() === "favorites") {
      return "Favorites"
    }
    if (props.selectedVault() !== "all") {
      return `${props.selectedVault()} Vault`
    }
    return vaultCategoryTitleResolve(props.selectedCategory())
  })

  const getItemSubtitle = (item: VaultItem): string => {
    if (item.username) return item.username
    if (item.category === "creditCard") {
      const cardNum = item.customFields?.find((f) => f.label.includes("Card Number"))?.value
      return cardNum ?? "Credit Card"
    }
    if (item.category === "identity") {
      const title = item.customFields?.find((f) => f.label === "Title" || f.label === "Full Name")?.value
      return title ?? "Identity Card"
    }
    if (item.category === "secureNote") {
      return item.notes ? (item.notes.split("\n")[0] ?? "Secure Note") : "Secure Note"
    }
    if (item.url) return item.url.replace(/^https?:\/\//, "")
    return item.vault
  }

  return {
    items: props.items,
    selectedItemId: props.selectedItemId,
    searchQuery: props.searchQuery,
    filterTitle,
    getCategoryIcon: vaultCategoryIconResolve,
    getCategoryTheme: vaultCategoryThemeResolve,
    getItemSubtitle,
    selectItem: props.onSelectItem,
    setSearchQuery: props.onSearchChange,
    resetFilter: props.onResetFilter,
  }
}
