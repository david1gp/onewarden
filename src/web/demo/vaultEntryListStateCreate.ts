import { createMemo } from "solid-js"
import type { VaultItem } from "./vaultItemSchema.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

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
    const catTitles: Record<string, string> = {
      login: "Logins",
      secureNote: "Secure Notes",
      creditCard: "Credit Cards",
      identity: "Identities",
      server: "Servers",
      sshKey: "SSH Keys",
    }
    return catTitles[props.selectedCategory()] ?? "All Items"
  })

  const getCategoryIcon = (category: string): string => {
    const map: Record<string, string> = {
      login: vaultSvgIcons.login,
      secureNote: vaultSvgIcons.secureNote,
      creditCard: vaultSvgIcons.creditCard,
      identity: vaultSvgIcons.identity,
      password: vaultSvgIcons.password,
      server: vaultSvgIcons.server,
      sshKey: vaultSvgIcons.sshKey,
    }
    return map[category] ?? vaultSvgIcons.login
  }

  const getCategoryTheme = (category: string): { bg: string; text: string } => {
    switch (category) {
      case "login":
        return { bg: "bg-blue-100 dark:bg-blue-950/60", text: "text-blue-600 dark:text-blue-400" }
      case "secureNote":
        return { bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-600 dark:text-amber-400" }
      case "creditCard":
        return { bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-600 dark:text-emerald-400" }
      case "identity":
        return { bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-600 dark:text-purple-400" }
      case "server":
        return { bg: "bg-slate-200 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" }
      case "sshKey":
        return { bg: "bg-teal-100 dark:bg-teal-950/60", text: "text-teal-600 dark:text-teal-400" }
      default:
        return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300" }
    }
  }

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
    getCategoryIcon,
    getCategoryTheme,
    getItemSubtitle,
    selectItem: props.onSelectItem,
    setSearchQuery: props.onSearchChange,
    resetFilter: props.onResetFilter,
  }
}
