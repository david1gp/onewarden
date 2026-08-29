import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { VaultCollection } from "../vault/model/vaultCollectionSchema.js"
import { vaultFilterApply } from "../vault/model/vaultFilterApply.js"
import type { VaultFolder } from "../vault/model/vaultFolderSchema.js"
import type { VaultItemCategory } from "../vault/model/vaultItemCategorySchema.js"
import { vaultKeyboardWorkflowHandle } from "../vault/model/vaultKeyboardWorkflowHandle.js"
import { vaultUrlStateParse } from "../vault/model/vaultUrlStateParse.js"
import { vaultUrlStateSync } from "../vault/model/vaultUrlStateSync.js"
import { vaultDemoStore } from "./vaultDemoStore.js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultWorkspaceProps {
  initialItems?: readonly VaultItem[]
  initialFolders?: readonly VaultFolder[]
  initialCollections?: readonly VaultCollection[]
  items?: () => readonly VaultItem[]
  folders?: () => readonly VaultFolder[]
  collections?: () => readonly VaultCollection[]
  profile?: () => { id?: string; name?: string; email?: string } | undefined
  includeDeleted?: boolean
  defaultSelectedId?: string
  defaultVault?: string
  defaultCategory?: string
  defaultFolder?: string | null
  defaultCollection?: string | null
  enableUrlSync?: boolean
  enableKeyboardWorkflows?: boolean
  onSelectItem?: (id: string | null) => void
  onToggleFavorite?: (id: string) => void
}

export function vaultWorkspaceStateCreate(props: VaultWorkspaceProps = {}) {
  const urlState =
    props.enableUrlSync && typeof window !== "undefined" ? vaultUrlStateParse(window.location.search) : {}

  const localItems =
    props.items === undefined && props.initialItems !== undefined
      ? createSignalObject<readonly VaultItem[]>(props.initialItems)
      : null
  const sourceItems = props.items ?? localItems?.get ?? vaultDemoStore.activeItems
  const items = () => {
    const list = sourceItems()
    if (props.includeDeleted) return list
    return list.filter((item) => !(item.deletedAt ?? item.deletedDate))
  }

  const localFolders = createSignalObject<readonly VaultFolder[]>(props.initialFolders ?? [])
  const localCollections = createSignalObject<readonly VaultCollection[]>(props.initialCollections ?? [])
  const folders = props.folders ?? localFolders.get
  const collections = props.collections ?? localCollections.get

  const selectedVault = createSignalObject(urlState.vault ?? props.defaultVault ?? "all")
  const selectedCategory = createSignalObject<VaultItemCategory>(
    (urlState.category as VaultItemCategory) ?? (props.defaultCategory as VaultItemCategory) ?? "all",
  )
  const selectedFolder = createSignalObject<string | null>(urlState.folder ?? props.defaultFolder ?? null)
  const selectedCollection = createSignalObject<string | null>(urlState.collection ?? props.defaultCollection ?? null)
  const searchQuery = createSignalObject(urlState.search ?? "")
  const selectedItemId = createSignalObject<string | null>(
    urlState.selectedItemId ?? props.defaultSelectedId ?? (items().length > 0 ? (items()[0]?.id ?? null) : null),
  )
  const formMode = createSignalObject<"none" | "add" | "edit">("none")
  const activeMobileTab = createSignalObject<"nav" | "list" | "detail">("list")
  const searchInputElement = createSignalObject<HTMLInputElement | null>(null)

  const currentFilter = () => ({
    vault: selectedVault.get(),
    category: selectedCategory.get(),
    folder: selectedFolder.get(),
    collection: selectedCollection.get(),
    search: searchQuery.get(),
    selectedItemId: selectedItemId.get(),
    includeDeleted: props.includeDeleted ?? false,
  })

  const filteredItems = () => vaultFilterApply(items(), currentFilter())

  const selectedItem = () => {
    const currentId = selectedItemId.get()
    if (!currentId) return null
    return filteredItems().find((item) => item.id === currentId) ?? null
  }

  const syncUrlIfEnabled = () => {
    if (props.enableUrlSync) {
      vaultUrlStateSync(currentFilter())
    }
  }

  const selectVault = (vault: string) => {
    selectedVault.set(vault)
    selectedCategory.set("all")
    selectedFolder.set(null)
    selectedCollection.set(null)
    activeMobileTab.set("list")
    syncUrlIfEnabled()
  }

  const selectCategory = (category: string) => {
    selectedCategory.set(category as VaultItemCategory)
    selectedFolder.set(null)
    selectedCollection.set(null)
    activeMobileTab.set("list")
    syncUrlIfEnabled()
  }

  const selectFolder = (folder: string | null) => {
    selectedFolder.set(folder)
    selectedCollection.set(null)
    activeMobileTab.set("list")
    syncUrlIfEnabled()
  }

  const selectCollection = (collection: string | null) => {
    selectedCollection.set(collection)
    selectedFolder.set(null)
    activeMobileTab.set("list")
    syncUrlIfEnabled()
  }

  const selectItem = (id: string) => {
    selectedItemId.set(id)
    formMode.set("none")
    activeMobileTab.set("detail")
    props.onSelectItem?.(id)
    syncUrlIfEnabled()
  }

  const setSearchQuery = (query: string) => {
    searchQuery.set(query)
    syncUrlIfEnabled()
  }

  const clearSearch = () => {
    searchQuery.set("")
    syncUrlIfEnabled()
  }

  const resetFilter = () => {
    selectedVault.set("all")
    selectedCategory.set("all")
    selectedFolder.set(null)
    selectedCollection.set(null)
    searchQuery.set("")
    syncUrlIfEnabled()
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
    if (saveResult.success) selectedItemId.set(saveResult.data.id)
    formMode.set("none")
  }

  const initialAddCategory = (): VaultItem["category"] => {
    const category = selectedCategory.get()
    if (
      category === "login" ||
      category === "secureNote" ||
      category === "creditCard" ||
      category === "identity" ||
      category === "sshKey"
    ) {
      return category
    }
    return "login"
  }

  const itemToEdit = () => (formMode.get() === "edit" ? selectedItem() : null)

  const toggleFavorite = (id: string) => {
    if (localItems) {
      const item = localItems.get().find((candidate) => candidate.id === id)
      if (!item || (item.ownership ?? "personal") !== "personal") return
      localItems.set(
        localItems
          .get()
          .map((candidate) => (candidate.id === id ? { ...candidate, favorite: !candidate.favorite } : candidate)),
      )
      props.onToggleFavorite?.(id)
      return
    }

    vaultDemoStore.toggleFavorite(id)
    props.onToggleFavorite?.(id)
  }

  const cloneItem = (id: string) => {
    if (localItems) {
      const source = localItems.get().find((item) => item.id === id)
      if (!source) return
      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const isPersonal = (source.ownership ?? "personal") === "personal"
      const sourceCollectionIds = source.collectionIds ?? []
      const cloned: VaultItem = {
        ...source,
        id: `item-${Date.now()}`,
        title: `Clone - ${source.title}`,
        ownership: isPersonal ? "personal" : "organization",
        organizationId: isPersonal ? null : (source.organizationId ?? "organization-acme"),
        collectionIds: isPersonal
          ? []
          : sourceCollectionIds.length > 0
            ? [...sourceCollectionIds]
            : ["collection-engineering"],
        vault: isPersonal ? "Personal" : (source.vault ?? "Work"),
        favorite: false,
        deletedAt: null,
        deletedDate: null,
        customFields: source.customFields ? source.customFields.map((field) => ({ ...field })) : undefined,
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
      const now = new Date().toISOString()
      const trashed: VaultItem = { ...item, deletedAt: now, deletedDate: now, favorite: false }
      localItems.set(localItems.get().map((candidate) => (candidate.id === id ? trashed : candidate)))
      const remaining = localItems.get().filter((candidate) => !(candidate.deletedAt ?? candidate.deletedDate))
      selectedItemId.set(remaining.length > 0 ? (remaining[0]?.id ?? null) : null)
      formMode.set("none")
      if (activeMobileTab.get() === "detail") activeMobileTab.set("list")
      return
    }

    const trashResult = vaultDemoStore.moveToTrash(id)
    if (!trashResult.success) return
    const remaining = filteredItems().filter((candidate) => candidate.id !== id)
    selectedItemId.set(remaining.length > 0 ? (remaining[0]?.id ?? null) : null)
    formMode.set("none")
    if (activeMobileTab.get() === "detail") activeMobileTab.set("list")
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (props.enableKeyboardWorkflows === false) return
    vaultKeyboardWorkflowHandle(event, {
      filteredItems,
      selectedItemId: selectedItemId.get,
      searchQuery: searchQuery.get,
      activeMobileTab: activeMobileTab.get,
      onSelectItem: selectItem,
      onClearSearch: clearSearch,
      onResetFilter: resetFilter,
      onSetMobileTab: activeMobileTab.set,
      searchInputElement: searchInputElement.get,
    })
  }

  onMount(() => {
    if (typeof document !== "undefined" && props.enableKeyboardWorkflows !== false) {
      document.addEventListener("keydown", handleKeyDown)
    }
  })

  onCleanup(() => {
    if (typeof document !== "undefined") document.removeEventListener("keydown", handleKeyDown)
  })

  return {
    items,
    folders,
    collections,
    filteredItems,
    selectedItem,
    itemToEdit,
    formMode: formMode.get,
    initialAddCategory,
    selectedVault: selectedVault.get,
    selectedCategory: selectedCategory.get,
    selectedFolder: selectedFolder.get,
    selectedCollection: selectedCollection.get,
    searchQuery: searchQuery.get,
    selectedItemId: selectedItemId.get,
    activeMobileTab: activeMobileTab.get,
    setMobileTab: activeMobileTab.set,
    setSearchInputElement: searchInputElement.set,
    selectVault,
    selectCategory,
    selectFolder,
    selectCollection,
    selectItem,
    setSearchQuery,
    clearSearch,
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
