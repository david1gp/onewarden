import { createMemo } from "solid-js"
import type { VaultCollection } from "../vault/model/vaultCollectionSchema.js"
import { vaultItemOwnershipResolve } from "../vault/model/vaultItemOwnershipResolve.js"
import type { VaultItem } from "../vault/model/vaultItemSchema.js"

interface VaultCounts {
  personal: number
  organization: number
}

export interface VaultNavStateProps {
  items: () => readonly VaultItem[]
  collections?: () => readonly VaultCollection[]
  selectedVault: () => string
  selectedCategory: () => string
  selectedFolder: () => string | null
  selectedCollection?: () => string | null
  profile?: () => { id?: string; name?: string; email?: string } | undefined
  onSelectVault: (vault: string) => void
  onSelectCategory: (category: string) => void
  onSelectFolder: (folder: string | null) => void
  onSelectCollection?: (collection: string | null) => void
}

export function vaultNavStateCreate(props: VaultNavStateProps) {
  const itemDeletedAtResolve = (item: VaultItem): string | null => item.deletedDate ?? item.deletedAt ?? null
  const activeItems = createMemo(() => props.items().filter((i) => !itemDeletedAtResolve(i)))
  const trashItems = createMemo(() => props.items().filter((i) => Boolean(itemDeletedAtResolve(i))))

  const totalCount = createMemo(() => activeItems().length)
  const favoritesCount = createMemo(
    () => activeItems().filter((i) => vaultItemOwnershipResolve(i) === "personal" && i.favorite).length,
  )
  const trashCount = createMemo(() => trashItems().length)

  const categoryCounts = createMemo(() => {
    const counts: Record<string, number> = {
      login: 0,
      secureNote: 0,
      creditCard: 0,
      identity: 0,
      server: 0,
      sshKey: 0,
    }
    for (const item of activeItems()) {
      const current = counts[item.category]
      if (current !== undefined) {
        counts[item.category] = current + 1
      }
    }
    return counts
  })

  const vaultCounts = createMemo<VaultCounts>(() => {
    let personal = 0
    let organization = 0
    for (const item of activeItems()) {
      if (vaultItemOwnershipResolve(item) === "organization") organization += 1
      else personal += 1
    }
    return { personal, organization }
  })

  const folders = createMemo(() => {
    const map = new Map<string, number>()
    for (const item of activeItems()) {
      if (item.folder) {
        map.set(item.folder, (map.get(item.folder) ?? 0) + 1)
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  })

  const collections = createMemo(() => {
    const rawCollections = props.collections ? props.collections() : []
    const counts = new Map<string, number>()
    for (const item of activeItems()) {
      if (item.collectionIds) {
        for (const colId of item.collectionIds) {
          counts.set(colId, (counts.get(colId) ?? 0) + 1)
        }
      }
    }
    return rawCollections.map((col) => ({
      ...col,
      count: counts.get(col.id) ?? 0,
    }))
  })

  const selectedCollection = () => (props.selectedCollection ? props.selectedCollection() : null)

  const userName = createMemo(() => {
    const p = props.profile ? props.profile() : undefined
    return p?.name ?? "Alex Rivera"
  })

  const userSubtitle = createMemo(() => {
    const p = props.profile ? props.profile() : undefined
    return p?.email ?? "Acme Corporation"
  })

  const userInitials = createMemo(() => {
    const name = userName()
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  })

  const selectQuick = (key: string) => {
    props.onSelectFolder(null)
    if (props.onSelectCollection) props.onSelectCollection(null)
    props.onSelectVault("all")
    props.onSelectCategory(key)
  }

  const selectVault = (vault: string) => {
    props.onSelectFolder(null)
    if (props.onSelectCollection) props.onSelectCollection(null)
    props.onSelectVault(vault)
  }

  const selectCategory = (cat: string) => {
    props.onSelectFolder(null)
    if (props.onSelectCollection) props.onSelectCollection(null)
    props.onSelectCategory(cat)
  }

  const selectFolder = (folder: string) => {
    if (props.onSelectCollection) props.onSelectCollection(null)
    if (props.selectedFolder() === folder) {
      props.onSelectFolder(null)
      return
    }
    props.onSelectFolder(folder)
  }

  const selectCollection = (colId: string) => {
    props.onSelectFolder(null)
    if (!props.onSelectCollection) return
    if (selectedCollection() === colId) {
      props.onSelectCollection(null)
      return
    }
    props.onSelectCollection(colId)
  }

  return {
    selectedVault: props.selectedVault,
    selectedCategory: props.selectedCategory,
    selectedFolder: props.selectedFolder,
    selectedCollection,
    totalCount,
    favoritesCount,
    trashCount,
    categoryCounts,
    vaultCounts,
    folders,
    collections,
    userName,
    userSubtitle,
    userInitials,
    selectQuick,
    selectVault,
    selectCategory,
    selectFolder,
    selectCollection,
  }
}
