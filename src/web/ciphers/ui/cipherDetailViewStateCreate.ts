import { createEffect, createMemo, onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { VaultCollection } from "../../vault/model/vaultCollectionSchema.js"
import { cipherCardBrandDetect } from "../model/cipherCardBrandDetect.js"
import { cipherCardFormat } from "../model/cipherCardFormat.js"
import { cipherCategoryIconResolve } from "../model/cipherCategoryIconResolve.js"
import { cipherCategoryLabelResolve } from "../model/cipherCategoryLabelResolve.js"
import { cipherCategoryThemeResolve } from "../model/cipherCategoryThemeResolve.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export interface CipherDetailViewStateProps {
  item: () => CipherItem | null
  collections?: () => readonly VaultCollection[]
  actions?: {
    copyToClipboard: (value: string) => Promise<void> | void
    toggleFavorite: (id: string) => Promise<void> | void
    delete: (id: string, hard: boolean) => Promise<void> | void
    restore: (id: string) => Promise<void> | void
    archive: (id: string, archived: boolean) => Promise<void> | void
    clone: (id: string) => Promise<void> | void
    share: (id: string, organizationId: string, collectionIds: string[]) => Promise<void> | void
    uploadAttachment: (id: string, file: File) => Promise<void> | void
    deleteAttachment: (id: string, attachmentId: string) => Promise<void> | void
  }
  onEdit?: (id: string) => void
  onToggleFavorite?: (id: string) => Promise<void> | void
  onDelete?: (id: string, hard: boolean) => Promise<void> | void
  onRestore?: (id: string) => Promise<void> | void
  onArchive?: (id: string, archived: boolean) => Promise<void> | void
  onClone?: (id: string) => Promise<void> | void
  onShare?: (id: string, organizationId: string, collectionIds: string[]) => Promise<void> | void
  onUploadAttachment?: (id: string, file: File) => Promise<void> | void
  onDeleteAttachment?: (id: string, attachmentId: string) => Promise<void> | void
  fillAvailable?: () => boolean
  onFill?: (id: string) => void
}

export function cipherDetailViewStateCreate(props: CipherDetailViewStateProps) {
  const displayedItem = createSignalObject<CipherItem | null>(props.item())
  const isPasswordRevealed = createSignalObject(false)
  const isCardNumberRevealed = createSignalObject(false)
  const isCvvRevealed = createSignalObject(false)
  const isSsnRevealed = createSignalObject(false)
  const isPassportRevealed = createSignalObject(false)
  const isSshPrivateKeyRevealed = createSignalObject(false)
  const copiedField = createSignalObject<string | null>(null)

  // Dialog open signals
  const isShareDialogOpen = createSignalObject(false)
  const isDeleteDialogOpen = createSignalObject(false)
  const deleteHardMode = createSignalObject(false)

  const isActionLoading = createSignalObject(false)
  const actionErrorMessage = createSignalObject<string | null>(null)
  const actions = props.actions ?? {
    copyToClipboard: () => undefined,
    toggleFavorite: props.onToggleFavorite ?? (() => undefined),
    delete: props.onDelete ?? (() => undefined),
    restore: props.onRestore ?? (() => undefined),
    archive: props.onArchive ?? (() => undefined),
    clone: props.onClone ?? (() => undefined),
    share: props.onShare ?? (() => undefined),
    uploadAttachment: props.onUploadAttachment ?? (() => undefined),
    deleteAttachment: props.onDeleteAttachment ?? (() => undefined),
  }

  let copyTimer: ReturnType<typeof setTimeout> | null = null
  let actionRequestId = 0

  const actionRequestBegin = () => {
    actionRequestId += 1
    return actionRequestId
  }

  const actionRequestIsCurrent = (requestId: number, cipherId: string) => {
    return requestId === actionRequestId && displayedItem.get()?.id === cipherId
  }

  const actionRequestInvalidate = () => {
    actionRequestBegin()
    isActionLoading.set(false)
    actionErrorMessage.set(null)
    isDeleteDialogOpen.set(false)
  }

  const resetTransientState = () => {
    isPasswordRevealed.set(false)
    isCardNumberRevealed.set(false)
    isCvvRevealed.set(false)
    isSsnRevealed.set(false)
    isPassportRevealed.set(false)
    isSshPrivateKeyRevealed.set(false)
    copiedField.set(null)
    if (copyTimer) {
      clearTimeout(copyTimer)
      copyTimer = null
    }
  }

  onCleanup(() => {
    actionRequestInvalidate()
    if (copyTimer) clearTimeout(copyTimer)
  })

  let previousItemId = displayedItem.get()?.id ?? null
  createEffect(() => {
    const externalItem = props.item()
    const currentItem = displayedItem.get()
    if (externalItem !== currentItem) displayedItem.set(externalItem)
    const itemId = externalItem?.id ?? null
    if (itemId === previousItemId) return
    previousItemId = itemId
    actionRequestInvalidate()
    resetTransientState()
  })

  const copyToClipboard = (fieldName: string, value: string) => {
    void Promise.resolve(actions.copyToClipboard(value)).catch(() => {})
    copiedField.set(fieldName)
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedField.set(null)
      copyTimer = null
    }, 2000)
  }

  const copyValueToClipboard = (value: string) => copyToClipboard("value", value)

  const togglePasswordReveal = () => isPasswordRevealed.set(!isPasswordRevealed.get())
  const toggleCardNumberReveal = () => isCardNumberRevealed.set(!isCardNumberRevealed.get())
  const toggleCvvReveal = () => isCvvRevealed.set(!isCvvRevealed.get())
  const toggleSsnReveal = () => isSsnRevealed.set(!isSsnRevealed.get())
  const togglePassportReveal = () => isPassportRevealed.set(!isPassportRevealed.get())

  const categoryTheme = createMemo(() => {
    const item = displayedItem.get()
    return cipherCategoryThemeResolve(item ? item.type : 1)
  })

  const categoryIcon = createMemo(() => {
    const item = displayedItem.get()
    return cipherCategoryIconResolve(item ? item.type : 1)
  })

  const categoryLabel = createMemo(() => {
    const item = displayedItem.get()
    return cipherCategoryLabelResolve(item ? item.type : 1)
  })

  const cardBrand = createMemo(() => {
    const item = displayedItem.get()
    if (item?.card?.brand) return item.card.brand
    return cipherCardBrandDetect(item?.card?.number)
  })

  const formattedCardNumber = createMemo(() => {
    const item = displayedItem.get()
    return cipherCardFormat(item?.card?.number, !isCardNumberRevealed.get())
  })

  const formattedIdentityFullName = createMemo(() => {
    const ident = displayedItem.get()?.identity
    if (!ident) return ""
    const parts = [ident.title, ident.firstName, ident.middleName, ident.lastName].filter(Boolean)
    return parts.join(" ")
  })

  const formattedIdentityAddress = createMemo(() => {
    const ident = displayedItem.get()?.identity
    if (!ident) return ""
    const street = [ident.address1, ident.address2, ident.address3].filter(Boolean).join(", ")
    const region = [ident.city, ident.state, ident.postalCode].filter(Boolean).join(" ")
    const parts = [street, region, ident.country].filter(Boolean)
    return parts.join("\n")
  })

  const customFields = () => displayedItem.get()?.fields ?? []
  const sshPrivateKeyValue = createMemo(() => {
    const privateKey = displayedItem.get()?.sshKey?.privateKey
    if (!privateKey) return ""
    if (!canViewPassword()) return "Hidden by organization policy"
    return isSshPrivateKeyRevealed.get() ? privateKey : "•".repeat(Math.min(privateKey.length, 64))
  })

  const isDeleted = createMemo(() => !!displayedItem.get()?.deletedDate)
  const isArchived = createMemo(() => !!displayedItem.get()?.archivedDate)
  const canViewPassword = createMemo(() => displayedItem.get()?.viewPassword !== false)
  const openShareDialog = () => isShareDialogOpen.set(true)
  const handleFill = () => {
    const item = displayedItem.get()
    if (item) props.onFill?.(item.id)
  }
  const toggleSshPrivateKeyReveal = () => {
    if (!canViewPassword()) return
    isSshPrivateKeyRevealed.set(!isSshPrivateKeyRevealed.get())
  }

  const openDeleteDialog = (hard: boolean) => {
    deleteHardMode.set(hard)
    isDeleteDialogOpen.set(true)
  }

  const handleConfirmDelete = async () => {
    const it = displayedItem.get()
    if (!it) return
    const requestId = actionRequestBegin()
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await actions.delete(it.id, deleteHardMode.get())
      if (!actionRequestIsCurrent(requestId, it.id)) return
      if (deleteHardMode.get()) displayedItem.set(null)
      else displayedItem.set({ ...it, deletedDate: new Date().toISOString() })
      if (!actionRequestIsCurrent(requestId, it.id)) return
      isDeleteDialogOpen.set(false)
    } catch (err: any) {
      if (!actionRequestIsCurrent(requestId, it.id)) return
      actionErrorMessage.set(err?.message ?? "Failed to delete cipher.")
    } finally {
      if (requestId === actionRequestId) isActionLoading.set(false)
    }
  }

  const handleRestore = async () => {
    const it = displayedItem.get()
    if (!it) return
    const requestId = actionRequestBegin()
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await actions.restore(it.id)
      if (!actionRequestIsCurrent(requestId, it.id)) return
    } catch (err: any) {
      if (!actionRequestIsCurrent(requestId, it.id)) return
      actionErrorMessage.set(err?.message ?? "Failed to restore cipher.")
    } finally {
      if (requestId === actionRequestId) isActionLoading.set(false)
    }
  }

  const handleToggleArchive = async () => {
    const it = displayedItem.get()
    if (!it) return
    const requestId = actionRequestBegin()
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await actions.archive(it.id, !isArchived())
      if (!actionRequestIsCurrent(requestId, it.id)) return
    } catch (err: any) {
      if (!actionRequestIsCurrent(requestId, it.id)) return
      actionErrorMessage.set(err?.message ?? "Failed to update archive status.")
    } finally {
      if (requestId === actionRequestId) isActionLoading.set(false)
    }
  }

  const handleClone = async () => {
    const it = displayedItem.get()
    if (!it) return
    const requestId = actionRequestBegin()
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await actions.clone(it.id)
      if (!actionRequestIsCurrent(requestId, it.id)) return
    } catch (err: any) {
      if (!actionRequestIsCurrent(requestId, it.id)) return
      actionErrorMessage.set(err?.message ?? "Failed to clone cipher.")
    } finally {
      if (requestId === actionRequestId) isActionLoading.set(false)
    }
  }

  const handleShareSubmit = async (organizationId: string, collectionIds: string[]) => {
    const it = displayedItem.get()
    if (!it) return
    const requestId = actionRequestBegin()
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await actions.share(it.id, organizationId, collectionIds)
      if (!actionRequestIsCurrent(requestId, it.id)) return
      isShareDialogOpen.set(false)
    } catch (err: any) {
      if (!actionRequestIsCurrent(requestId, it.id)) return
      actionErrorMessage.set(err?.message ?? "Failed to share cipher.")
    } finally {
      if (requestId === actionRequestId) isActionLoading.set(false)
    }
  }

  const handleUploadAttachment = async (file: File) => {
    const it = displayedItem.get()
    if (!it) return
    const requestId = actionRequestBegin()
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await actions.uploadAttachment(it.id, file)
      if (!actionRequestIsCurrent(requestId, it.id)) return
    } catch (err: any) {
      if (!actionRequestIsCurrent(requestId, it.id)) return
      actionErrorMessage.set(err?.message ?? "Failed to upload attachment.")
    } finally {
      if (requestId === actionRequestId) isActionLoading.set(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    const it = displayedItem.get()
    if (!it) return
    const requestId = actionRequestBegin()
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await actions.deleteAttachment(it.id, attachmentId)
      if (!actionRequestIsCurrent(requestId, it.id)) return
    } catch (err: any) {
      if (!actionRequestIsCurrent(requestId, it.id)) return
      actionErrorMessage.set(err?.message ?? "Failed to delete attachment.")
    } finally {
      if (requestId === actionRequestId) isActionLoading.set(false)
    }
  }

  const toggleFavorite = async () => {
    const it = displayedItem.get()
    if (!it) return
    const requestId = actionRequestBegin()
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await actions.toggleFavorite(it.id)
      if (!actionRequestIsCurrent(requestId, it.id)) return
      displayedItem.set({ ...it, favorite: !it.favorite })
      if (!actionRequestIsCurrent(requestId, it.id)) return
    } catch (err: any) {
      if (!actionRequestIsCurrent(requestId, it.id)) return
      actionErrorMessage.set(err?.message ?? "Failed to update favorite status.")
    } finally {
      if (requestId === actionRequestId) isActionLoading.set(false)
    }
  }

  return {
    collections: () => props.collections?.() ?? [],
    item: displayedItem.get,
    itemId: () => displayedItem.get()?.id ?? null,
    isPasswordRevealed: isPasswordRevealed.get,
    isCardNumberRevealed: isCardNumberRevealed.get,
    isCvvRevealed: isCvvRevealed.get,
    isSsnRevealed: isSsnRevealed.get,
    isPassportRevealed: isPassportRevealed.get,
    isSshPrivateKeyRevealed: isSshPrivateKeyRevealed.get,
    copiedField: copiedField.get,
    categoryTheme,
    categoryIcon,
    categoryLabel,
    cardBrand,
    formattedCardNumber,
    formattedIdentityFullName,
    formattedIdentityAddress,
    customFields,
    sshPrivateKeyValue,
    isDeleted,
    isArchived,
    canViewPassword,
    isShareDialogOpen,
    isDeleteDialogOpen,
    deleteHardMode: deleteHardMode.get,
    isActionLoading: isActionLoading.get,
    actionErrorMessage: actionErrorMessage.get,
    copyToClipboard,
    copyValueToClipboard,
    togglePasswordReveal,
    toggleCardNumberReveal,
    toggleCvvReveal,
    toggleSsnReveal,
    togglePassportReveal,
    toggleSshPrivateKeyReveal,
    openShareDialog,
    openDeleteDialog,
    handleConfirmDelete,
    handleRestore,
    handleToggleArchive,
    handleClone,
    handleShareSubmit,
    handleUploadAttachment,
    handleDeleteAttachment,
    toggleFavorite,
    fillAvailable: props.fillAvailable ?? (() => false),
    handleFill,
    editItem: () => {
      const it = displayedItem.get()
      if (it && props.onEdit) props.onEdit(it.id)
    },
  }
}
