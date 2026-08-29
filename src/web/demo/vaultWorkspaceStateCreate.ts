import { createEffect, createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webAuthSessionDefault } from "../auth/model/webAuthSessionDefault.js"
import { cipherApiClientCreate } from "../ciphers/actions/cipherApiClientCreate.js"
import { cipherItemFromDemo } from "../ciphers/model/cipherItemFromDemo.js"
import { cipherTypeToCategory } from "../ciphers/model/cipherTypeToCategory.js"
import type { CipherDialogMode } from "../ciphers/schemas/cipherDialogModeSchema.js"
import type { CipherItem } from "../ciphers/schemas/cipherItemSchema.js"
import type { VaultCollection } from "../vault/model/vaultCollectionSchema.js"
import { vaultFilterApply } from "../vault/model/vaultFilterApply.js"
import type { VaultFolder } from "../vault/model/vaultFolderSchema.js"
import type { VaultItemCategory } from "../vault/model/vaultItemCategorySchema.js"
import { vaultItemOwnershipResolve } from "../vault/model/vaultItemOwnershipResolve.js"
import { vaultKeyboardWorkflowHandle } from "../vault/model/vaultKeyboardWorkflowHandle.js"
import { vaultOwnershipScopeResolve } from "../vault/model/vaultOwnershipScopeResolve.js"
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
  apiBacked?: boolean
  onSelectItem?: (id: string | null) => void
  onToggleFavorite?: (id: string) => Promise<void> | void
  onRestoreItem?: (id: string) => void
  onPermanentlyDeleteItem?: (id: string) => void
}

function vaultItemFromCipher(cipher: CipherItem): VaultItem {
  return {
    id: cipher.id,
    title: cipher.name,
    category: cipherTypeToCategory(cipher.type),
    vault: cipher.organizationId ? "Acme Corporation" : "My Vault",
    ownership: cipher.organizationId ? "organization" : "personal",
    organizationId: cipher.organizationId,
    folderId: cipher.folderId,
    collectionIds: cipher.collectionIds ?? [],
    favorite: cipher.favorite,
    username: cipher.login?.username ?? undefined,
    password: cipher.login?.password ?? undefined,
    totp: cipher.login?.totp ?? undefined,
    url: cipher.login?.uris?.[0]?.uri ?? undefined,
    notes: cipher.notes ?? undefined,
    folder: cipher.folderName ?? undefined,
    updatedAt: cipher.revisionDate ?? "Just now",
    createdAt: cipher.creationDate ?? "Recently",
    deletedDate: cipher.deletedDate,
    archivedDate: cipher.archivedDate,
    customFields: cipher.fields?.map((field) => ({
      label: field.name,
      value: field.value,
      concealed: field.type === 1,
    })),
  }
}

export function vaultWorkspaceStateCreate(props: VaultWorkspaceProps = {}) {
  const apiClient = cipherApiClientCreate()
  const session = webAuthSessionDefault()
  const cipherItems = createSignalObject<readonly CipherItem[]>([])
  const apiItems = createSignalObject<readonly VaultItem[] | null>(null)
  const isApiBacked = props.apiBacked ?? false
  let apiListRequested = false
  const urlState =
    props.enableUrlSync && typeof window !== "undefined" ? vaultUrlStateParse(window.location.search) : {}

  const localItems =
    props.items === undefined && props.initialItems !== undefined
      ? createSignalObject<readonly VaultItem[]>(props.initialItems)
      : null
  const sourceItems = () => {
    const fetchedItems = apiItems.get()
    if (fetchedItems !== null) return fetchedItems
    return props.items?.() ?? localItems?.get() ?? vaultDemoStore.activeItems()
  }
  const items = () => {
    const list = sourceItems()
    if (props.includeDeleted || selectedCategory.get() === "trash") return list
    return list.filter((item) => !(item.deletedAt ?? item.deletedDate))
  }
  const navigationItems = () => sourceItems()

  const localFolders = createSignalObject<readonly VaultFolder[]>(props.initialFolders ?? [])
  const localCollections = createSignalObject<readonly VaultCollection[]>(props.initialCollections ?? [])
  const folders = props.folders ?? localFolders.get
  const collections = props.collections ?? localCollections.get

  const initialVault = urlState.vault ?? props.defaultVault ?? "all"
  const selectedVault = createSignalObject(vaultOwnershipScopeResolve(initialVault) ?? initialVault)
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

  const selectedCipherItem = createMemo(() => {
    const selectedId = selectedItemId.get()
    if (!selectedId) return null
    const fetchedCipher = cipherItems.get().find((cipher) => cipher.id === selectedId)
    if (fetchedCipher) return fetchedCipher
    const item = selectedItem()
    return item ? cipherItemFromDemo(item) : null
  })

  const syncUrlIfEnabled = () => {
    if (props.enableUrlSync) vaultUrlStateSync(currentFilter())
  }

  const selectVault = (vault: string) => {
    selectedVault.set(vaultOwnershipScopeResolve(vault) ?? vault)
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

  const clearSearch = () => setSearchQuery("")

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

  const cancelForm = () => formMode.set("none")

  const selectItemAfterMutation = (id: string | null, mobileTab: "nav" | "list" | "detail") => {
    selectedItemId.set(id)
    formMode.set("none")
    activeMobileTab.set(mobileTab)
    syncUrlIfEnabled()
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

  const toggleFavorite = async (id: string): Promise<void> => {
    if (!isApiBacked) {
      if (localItems) {
        const item = localItems.get().find((candidate) => candidate.id === id)
        if (!item || vaultItemOwnershipResolve(item) !== "personal") return
        localItems.set(
          localItems
            .get()
            .map((candidate) => (candidate.id === id ? { ...candidate, favorite: !candidate.favorite } : candidate)),
        )
      } else {
        vaultDemoStore.toggleFavorite(id)
      }
      props.onToggleFavorite?.(id)
      return
    }

    const current = items().find((item) => item.id === id)
    if (!current) return
    const favorite = !current.favorite
    if (localItems) {
      localItems.set(localItems.get().map((item) => (item.id === id ? { ...item, favorite } : item)))
    }
    if (apiItems.get() !== null) {
      apiItems.set(apiItems.get()?.map((item) => (item.id === id ? { ...item, favorite } : item)) ?? [])
    }
    const result = await apiClient.favorite(id, favorite)
    if (!result.success) {
      localItems?.set(localItems.get().map((item) => (item.id === id ? { ...item, favorite: !favorite } : item)))
      throw new Error(result.errorMessage)
    }
    cipherItems.set(cipherItems.get().map((cipher) => (cipher.id === id ? { ...cipher, favorite } : cipher)))
    await props.onToggleFavorite?.(id)
  }

  const openCreateDialog = () => {
    cipherDialogMode.set("create")
    cipherDialogId.set(null)
    isCipherDialogOpen.set(true)
  }

  const openEditDialog = (id?: string) => {
    const targetId = id ?? selectedItemId.get()
    cipherDialogMode.set("edit")
    cipherDialogId.set(targetId)
    isCipherDialogOpen.set(true)
  }

  const handleCipherSaved = (saved: CipherItem) => {
    const vaultItem = vaultItemFromCipher(saved)
    if (localItems) {
      const existing = localItems.get()
      const index = existing.findIndex((item) => item.id === saved.id)
      if (index >= 0) {
        const updated = [...existing]
        updated[index] = vaultItem
        localItems.set(updated)
      } else {
        localItems.set([vaultItem, ...existing])
      }
    }
    if (apiItems.get() !== null) {
      const existing = apiItems.get() ?? []
      const index = existing.findIndex((item) => item.id === saved.id)
      if (index >= 0) {
        const updated = [...existing]
        updated[index] = vaultItem
        apiItems.set(updated)
      } else {
        apiItems.set([vaultItem, ...existing])
      }
    }
    const existingCiphers = cipherItems.get()
    const cipherIndex = existingCiphers.findIndex((cipher) => cipher.id === saved.id)
    if (cipherIndex >= 0) {
      const updated = [...existingCiphers]
      updated[cipherIndex] = saved
      cipherItems.set(updated)
    } else {
      cipherItems.set([saved, ...existingCiphers])
    }
    selectedItemId.set(saved.id)
  }

  const handleCipherDeleted = async (id: string, hard: boolean): Promise<void> => {
    if (hard) {
      localItems?.set(localItems.get().filter((item) => item.id !== id))
      if (apiItems.get() !== null) apiItems.set(apiItems.get()?.filter((item) => item.id !== id) ?? [])
      cipherItems.set(cipherItems.get().filter((cipher) => cipher.id !== id))
      if (selectedItemId.get() === id) selectedItemId.set(items().find((item) => item.id !== id)?.id ?? null)
      return
    }
    await cipherRefresh(id)
  }

  const updateCipher = (updated: CipherItem) => {
    handleCipherSaved(updated)
    selectedItemId.set(updated.id)
  }

  const cipherRefresh = async (id: string): Promise<void> => {
    const result = await apiClient.get(id)
    if (!result.success) throw new Error(result.errorMessage)
    updateCipher(result.data)
  }

  const handleCipherDelete = async (id: string, hard: boolean): Promise<void> => {
    const result = hard ? await apiClient.hardDelete(id) : await apiClient.softDelete(id)
    if (!result.success) throw new Error(result.errorMessage)
    if (hard) {
      await handleCipherDeleted(id, true)
      return
    }
    await cipherRefresh(id)
  }

  const handleCipherRestore = async (id: string): Promise<void> => {
    const result = await apiClient.restore(id)
    if (!result.success) throw new Error(result.errorMessage)
    updateCipher(result.data)
  }

  const handleCipherArchive = async (id: string, archived: boolean): Promise<void> => {
    const result = await apiClient.archive(id, archived)
    if (!result.success) throw new Error(result.errorMessage)
    updateCipher(result.data)
  }

  const handleCipherClone = async (id: string): Promise<void> => {
    const result = await apiClient.clone(id)
    if (!result.success) throw new Error(result.errorMessage)
    updateCipher(result.data)
  }

  const handleCipherShare = async (id: string, organizationId: string, collectionIds: string[]): Promise<void> => {
    const cipher =
      cipherItems.get().find((item) => item.id === id) ?? (selectedItemId.get() === id ? selectedCipherItem() : null)
    if (!cipher) throw new Error("Cipher not found.")
    const result = cipher.organizationId
      ? await apiClient.updateCollections(id, collectionIds)
      : await apiClient.share(id, organizationId, collectionIds, cipher)
    if (!result.success) throw new Error(result.errorMessage)
    updateCipher(result.data)
  }

  const handleCipherUploadAttachment = async (id: string, file: File): Promise<void> => {
    const result = await apiClient.uploadAttachment(id, file, file.name)
    if (!result.success) throw new Error(result.errorMessage)
    updateCipher(result.data)
  }

  const handleCipherDeleteAttachment = async (id: string, attachmentId: string): Promise<void> => {
    const result = await apiClient.deleteAttachment(id, attachmentId)
    if (!result.success) throw new Error(result.errorMessage)
    await cipherRefresh(id)
  }

  const cloneItem = (id: string) => {
    if (localItems) {
      const source = localItems.get().find((item) => item.id === id)
      if (!source) return
      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const isPersonal = vaultItemOwnershipResolve(source) === "personal"
      const cloned: VaultItem = {
        ...source,
        id: `item-${Date.now()}`,
        title: `Clone - ${source.title}`,
        ownership: isPersonal ? "personal" : "organization",
        organizationId: isPersonal ? null : (source.organizationId ?? "organization-acme"),
        collectionIds: isPersonal ? [] : [...(source.collectionIds ?? ["collection-engineering"])],
        vault: isPersonal ? "Personal" : (source.vault ?? "Work"),
        favorite: false,
        deletedAt: null,
        deletedDate: null,
        customFields: source.customFields?.map((field) => ({ ...field })),
        createdAt: formattedDate,
        updatedAt: formattedDate,
      }
      localItems.set([...localItems.get(), cloned])
      selectItemAfterMutation(cloned.id, "detail")
      return
    }

    const cloneResult = vaultDemoStore.cloneItem(id)
    if (cloneResult.success) {
      selectItemAfterMutation(cloneResult.data.id, "detail")
    }
  }

  const selectItemAfterRemoval = (id: string) => {
    const remaining = filteredItems().filter((candidate) => candidate.id !== id)
    selectItemAfterMutation(
      remaining[0]?.id ?? null,
      activeMobileTab.get() === "detail" ? "list" : activeMobileTab.get(),
    )
  }

  const moveToTrash = (id: string) => {
    if (localItems) {
      const item = localItems.get().find((candidate) => candidate.id === id)
      if (!item) return
      const now = new Date().toISOString()
      const trashed: VaultItem = { ...item, deletedAt: now, deletedDate: now, favorite: false }
      localItems.set(localItems.get().map((candidate) => (candidate.id === id ? trashed : candidate)))
      selectItemAfterRemoval(id)
      return
    }

    const trashResult = vaultDemoStore.moveToTrash(id)
    if (!trashResult.success) return
    selectItemAfterRemoval(id)
  }

  const restoreItem = (id: string) => {
    if (props.onRestoreItem) {
      props.onRestoreItem(id)
    } else if (localItems) {
      localItems.set(
        localItems.get().map((item) => (item.id === id ? { ...item, deletedAt: null, deletedDate: null } : item)),
      )
    } else {
      vaultDemoStore.restoreItem(id)
    }

    selectItemAfterRemoval(id)
  }

  const permanentlyDeleteItem = (id: string) => {
    if (props.onPermanentlyDeleteItem) {
      props.onPermanentlyDeleteItem(id)
    } else if (localItems) {
      localItems.set(localItems.get().filter((item) => item.id !== id))
    } else {
      vaultDemoStore.permanentlyDeleteItem(id)
    }

    selectItemAfterRemoval(id)
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

  createEffect(() => {
    if (!isApiBacked || apiListRequested || !session.isUnlocked()) return
    apiListRequested = true
    void apiClient.list().then((result) => {
      if (!result.success) return
      cipherItems.set(result.data)
      apiItems.set(result.data.map(vaultItemFromCipher))
      localItems?.set(result.data.map(vaultItemFromCipher))
      const selectedId = selectedItemId.get()
      if (selectedId === null || !result.data.some((cipher) => cipher.id === selectedId)) {
        selectedItemId.set(result.data[0]?.id ?? null)
      }
    })
  })

  onMount(() => {
    if (typeof document !== "undefined" && props.enableKeyboardWorkflows !== false) {
      document.addEventListener("keydown", handleKeyDown)
    }
  })

  onCleanup(() => {
    if (typeof document !== "undefined") document.removeEventListener("keydown", handleKeyDown)
  })

  const isCipherDialogOpen = createSignalObject(false)
  const cipherDialogMode = createSignalObject<CipherDialogMode>("create")
  const cipherDialogId = createSignalObject<string | null>(null)

  return {
    items,
    navigationItems,
    folders,
    collections,
    filteredItems,
    selectedItem,
    selectedCipherItem,
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
    restoreItem,
    permanentlyDeleteItem,
    toggleFavorite,
    isApiBacked,
    isCipherDialogOpen,
    cipherDialogMode,
    cipherDialogId: cipherDialogId.get,
    openCreateDialog,
    openEditDialog,
    handleCipherSaved,
    handleCipherDeleted,
    handleCipherDelete,
    handleCipherRestore,
    handleCipherArchive,
    handleCipherClone,
    handleCipherShare,
    handleCipherUploadAttachment,
    handleCipherDeleteAttachment,
  }
}
