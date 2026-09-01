import { createMemo } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { vaultSortDefault } from "../../shared/vault/vaultSortDefault.js"
import { vaultSortOptions } from "../../shared/vault/vaultSortOptions.js"
import type { VaultCollection } from "../vault/model/vaultCollectionSchema.js"
import { vaultCardPanMask } from "./vaultCardPanMask.js"
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
  selectedCollection?: () => string | null
  collections?: () => readonly VaultCollection[]
  selectedSortSignal?: SignalObject<string>
  searchInputElement?: (element: HTMLInputElement) => void
  onSelectItem: (id: string) => void
  onSearchChange: (query: string) => void
  onResetFilter: () => void
  onAddNewItem?: () => void
  onAddNew?: () => void
}

export function vaultEntryListStateCreate(props: VaultEntryListStateProps) {
  const fallbackSortSignal = createSignalObject<string>(vaultSortDefault)
  const sortSignal = props.selectedSortSignal ?? fallbackSortSignal

  const sortOptions = () => vaultSortOptions.map((option) => option.value)
  const sortOptionLabel = (value: string) => vaultSortOptions.find((option) => option.value === value)?.label ?? value

  const filterTitle = createMemo(() => {
    if (props.selectedFolder()) {
      return props.selectedFolder() ?? "Folders"
    }

    const colId = props.selectedCollection ? props.selectedCollection() : null
    if (colId) {
      const colList = props.collections ? props.collections() : []
      const found = colList.find((c) => c.id === colId)
      return found ? found.name : "Collection"
    }

    if (props.selectedCategory() === "favorites") {
      return "Favorites"
    }
    if (props.selectedVault() === "Personal" || props.selectedVault() === "personal") {
      return "My Vault"
    }
    if (
      props.selectedVault() === "Work" ||
      props.selectedVault() === "organization" ||
      props.selectedVault() === "organization-acme" ||
      props.selectedVault() === "Acme Corporation"
    ) {
      return "Acme Corporation"
    }

    if (props.selectedCategory() === "trash") {
      return "Trash"
    }
    if (props.selectedVault() !== "all") {
      return `${props.selectedVault()} Vault`
    }
    return vaultCategoryTitleResolve(props.selectedCategory())
  })

  const getItemSubtitle = (item: VaultItem): string => {
    if (item.username) return item.username
    if (item.category === "creditCard") {
      const cardNum = item.customFields?.find((f) => f.label.toLowerCase().includes("card number"))?.value
      if (cardNum?.trim()) {
        const masked = vaultCardPanMask(cardNum)
        return masked || "Credit Card"
      }
      return "Credit Card"
    }
    if (item.category === "identity") {
      const title = item.customFields?.find((f) => f.label === "Title" || f.label === "Full Name")?.value
      return title ?? "Identity Card"
    }
    if (item.category === "sshKey") {
      const fingerprint = item.customFields?.find((f) => f.label === "Fingerprint")?.value
      const keyType = item.customFields?.find((f) => f.label === "Key Type")?.value
      return fingerprint ?? keyType ?? "SSH Key"
    }
    if (item.category === "secureNote") {
      return item.notes ? (item.notes.split("\n")[0] ?? "Secure Note") : "Secure Note"
    }
    if (item.url) return item.url.replace(/^https?:\/\//, "")
    return item.ownership === "organization" ? "Acme Corporation" : "Personal"
  }

  return {
    items: props.items,
    selectedItemId: props.selectedItemId,
    searchQuery: props.searchQuery,
    sortSignal,
    sortOptions,
    sortOptionLabel,
    filterTitle,
    getCategoryIcon: vaultCategoryIconResolve,
    getCategoryTheme: vaultCategoryThemeResolve,
    getItemSubtitle,
    selectItem: props.onSelectItem,
    setSearchQuery: props.onSearchChange,
    resetFilter: props.onResetFilter,
    addNewItem: () => props.onAddNewItem?.(),
    onAddNew: () => (props.onAddNewItem ?? props.onAddNew)?.(),
  }
}
