import { createMemo } from "solid-js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultNavStateProps {
  items: () => readonly VaultItem[]
  selectedVault: () => string
  selectedCategory: () => string
  selectedFolder: () => string | null
  onSelectVault: (vault: string) => void
  onSelectCategory: (category: string) => void
  onSelectFolder: (folder: string | null) => void
}

export function vaultNavStateCreate(props: VaultNavStateProps) {
  const totalCount = createMemo(() => props.items().length)

  const favoritesCount = createMemo(() => props.items().filter((i) => i.favorite).length)

  const categoryCounts = createMemo(() => {
    const counts: Record<string, number> = {
      login: 0,
      secureNote: 0,
      creditCard: 0,
      identity: 0,
      server: 0,
      sshKey: 0,
    }
    for (const item of props.items()) {
      const current = counts[item.category]
      if (current !== undefined) {
        counts[item.category] = current + 1
      }
    }
    return counts
  })

  const vaultCounts = createMemo(() => {
    const counts: Record<string, number> = {
      Personal: 0,
      Work: 0,
      Shared: 0,
    }
    for (const item of props.items()) {
      const current = counts[item.vault]
      if (current !== undefined) {
        counts[item.vault] = current + 1
      }
    }
    return counts
  })

  const folders = createMemo(() => {
    const map = new Map<string, number>()
    for (const item of props.items()) {
      if (item.folder) {
        map.set(item.folder, (map.get(item.folder) ?? 0) + 1)
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  })

  const selectQuick = (key: string) => {
    props.onSelectFolder(null)
    props.onSelectVault("all")
    props.onSelectCategory(key)
  }

  const selectVault = (vault: string) => {
    props.onSelectFolder(null)
    props.onSelectVault(vault)
  }

  const selectCategory = (cat: string) => {
    props.onSelectFolder(null)
    props.onSelectCategory(cat)
  }

  const selectFolder = (folder: string) => {
    if (props.selectedFolder() === folder) {
      props.onSelectFolder(null)
      return
    }
    props.onSelectFolder(folder)
  }

  return {
    selectedVault: props.selectedVault,
    selectedCategory: props.selectedCategory,
    selectedFolder: props.selectedFolder,
    totalCount,
    favoritesCount,
    categoryCounts,
    vaultCounts,
    folders,
    selectQuick,
    selectVault,
    selectCategory,
    selectFolder,
  }
}
