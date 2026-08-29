import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultDemoStore } from "./vaultDemoStore.js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultWorkspaceProps {
  initialItems?: readonly VaultItem[]
  items?: () => readonly VaultItem[]
  includeDeleted?: boolean
  defaultSelectedId?: string
  defaultVault?: string
  defaultCategory?: string
  defaultFolder?: string | null
}

export function vaultWorkspaceStateCreate(props: VaultWorkspaceProps = {}) {
  const localItems =
    props.items === undefined && props.initialItems !== undefined ? createSignalObject(props.initialItems) : null
  const sourceItems = props.items ?? localItems?.get ?? vaultDemoStore.activeItems
  const items = createMemo(() => {
    const list = sourceItems()
    if (props.includeDeleted) return list
    return list.filter((item) => item.deletedAt === null)
  })
  const selectedVault = createSignalObject(props.defaultVault ?? "all")
  const selectedCategory = createSignalObject(props.defaultCategory ?? "all")
  const selectedFolder = createSignalObject<string | null>(props.defaultFolder ?? null)
  const searchQuery = createSignalObject("")
  const selectedItemId = createSignalObject<string | null>(
    props.defaultSelectedId ?? (items().length > 0 ? (items()[0]?.id ?? null) : null),
  )
  const formMode = createSignalObject<"none" | "add" | "edit">("none")
  const activeMobileTab = createSignalObject<"nav" | "list" | "detail">("list")

  const filteredItems = createMemo(() => {
    const list = items()
    const vault = selectedVault.get()
    const category = selectedCategory.get()
    const folder = selectedFolder.get()
    const query = searchQuery.get().trim().toLowerCase()

    return list.filter((item) => {
      if (vault !== "all") {
        if (vault === "Personal" || vault === "personal") {
          if (item.ownership !== "personal") return false
        } else if (
          vault === "Work" ||
          vault === "organization" ||
          vault === "organization-acme" ||
          vault === "Acme Corporation"
        ) {
          if (item.ownership !== "organization") return false
        } else if (item.vault !== vault) {
          return false
        }
      }
      if (category === "favorites" && (item.ownership !== "personal" || !item.favorite)) {
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
    formMode.set("none")
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

  const startAdd = () => {
    formMode.set("add")
    activeMobileTab.set("detail")
  }

  const startEdit = () => {
    if (!selectedItem()) return
    formMode.set("edit")
    activeMobileTab.set("detail")
  }

  const cancelForm = () => {
    formMode.set("none")
  }

  const saveItem = (itemToSave: VaultItem) => {
    if (localItems) {
      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const existing = localItems.get().find((item) => item.id === itemToSave.id)
      const finalizedItem: VaultItem = {
        ...itemToSave,
        id: itemToSave.id || `item-${Date.now()}`,
        createdAt: existing?.createdAt ?? itemToSave.createdAt ?? formattedDate,
        updatedAt: formattedDate,
      }
      if (existing) {
        localItems.set(localItems.get().map((item) => (item.id === finalizedItem.id ? finalizedItem : item)))
      } else {
        localItems.set([...localItems.get(), finalizedItem])
      }
      selectedItemId.set(finalizedItem.id)
      formMode.set("none")
      return
    }

    const saveResult = vaultDemoStore.saveItem(itemToSave)
    if (saveResult.success) {
      selectedItemId.set(saveResult.data.id)
    }
    formMode.set("none")
  }

  const initialAddCategory = createMemo<VaultItem["category"]>(() => {
    const cat = selectedCategory.get()
    if (cat === "login" || cat === "secureNote" || cat === "creditCard" || cat === "identity" || cat === "sshKey") {
      return cat
    }
    return "login"
  })

  const itemToEdit = createMemo(() => {
    if (formMode.get() === "edit") {
      return selectedItem()
    }
    return null
  })

  const toggleFavorite = (id: string) => {
    if (localItems) {
      const item = localItems.get().find((candidate) => candidate.id === id)
      if (item?.ownership !== "personal") return
      localItems.set(
        localItems
          .get()
          .map((candidate) => (candidate.id === id ? { ...candidate, favorite: !candidate.favorite } : candidate)),
      )
      return
    }
    vaultDemoStore.toggleFavorite(id)
  }

  const cloneItem = (id: string) => {
    if (localItems) {
      const source = localItems.get().find((item) => item.id === id)
      if (!source) return
      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const isPersonal = source.ownership === "personal"
      const cloned: VaultItem = {
        ...source,
        id: `item-${Date.now()}`,
        title: `Clone - ${source.title}`,
        ownership: source.ownership,
        organizationId: isPersonal ? null : (source.organizationId ?? "organization-acme"),
        collectionIds: isPersonal
          ? []
          : source.collectionIds.length > 0
            ? [...source.collectionIds]
            : ["collection-engineering"],
        vault: isPersonal ? "Personal" : (source.vault ?? "Work"),
        favorite: false,
        deletedAt: null,
        customFields: source.customFields ? source.customFields.map((f) => ({ ...f })) : undefined,
        createdAt: formattedDate,
        updatedAt: formattedDate,
      }
      localItems.set([...localItems.get(), cloned])
      selectedItemId.set(cloned.id)
      formMode.set("none")
      activeMobileTab.set("detail")
      return
    }

    const cloneResult = vaultDemoStore.cloneItem(id)
    if (cloneResult.success) {
      selectedItemId.set(cloneResult.data.id)
      formMode.set("none")
      activeMobileTab.set("detail")
    }
  }

  const moveToTrash = (id: string) => {
    if (localItems) {
      const item = localItems.get().find((candidate) => candidate.id === id)
      if (!item) return
      const now = new Date()
      const trashed: VaultItem = {
        ...item,
        deletedAt: now.toISOString(),
        favorite: false,
      }
      localItems.set(localItems.get().map((candidate) => (candidate.id === id ? trashed : candidate)))
      const remaining = localItems.get().filter((candidate) => candidate.deletedAt === null)
      selectedItemId.set(remaining.length > 0 ? (remaining[0]?.id ?? null) : null)
      formMode.set("none")
      if (activeMobileTab.get() === "detail") {
        activeMobileTab.set("list")
      }
      return
    }

    const trashResult = vaultDemoStore.moveToTrash(id)
    if (trashResult.success) {
      const remaining = filteredItems().filter((candidate) => candidate.id !== id)
      selectedItemId.set(remaining.length > 0 ? (remaining[0]?.id ?? null) : null)
      formMode.set("none")
      if (activeMobileTab.get() === "detail") {
        activeMobileTab.set("list")
      }
    }
  }

  return {
    items,
    filteredItems,
    selectedItem,
    itemToEdit,
    formMode: formMode.get,
    initialAddCategory,
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
    startAdd,
    startEdit,
    cancelForm,
    saveItem,
    cloneItem,
    moveToTrash,
    toggleFavorite,
  }
}
