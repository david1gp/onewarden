import { createEffect, createMemo, onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { cipherApiClientCreate } from "../actions/cipherApiClientCreate.js"
import { cipherCardBrandDetect } from "../model/cipherCardBrandDetect.js"
import { cipherCardFormat } from "../model/cipherCardFormat.js"
import { cipherCategoryIconResolve } from "../model/cipherCategoryIconResolve.js"
import { cipherCategoryLabelResolve } from "../model/cipherCategoryLabelResolve.js"
import { cipherCategoryThemeResolve } from "../model/cipherCategoryThemeResolve.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export interface CipherDetailViewStateProps {
  item: () => CipherItem | null
  onToggleFavorite?: (id: string) => Promise<void> | void
  onEdit?: (id: string) => void
  onDelete?: (id: string, hard: boolean) => Promise<void> | void
  onRestore?: (id: string) => Promise<void> | void
  onArchive?: (id: string, archived: boolean) => Promise<void> | void
  onClone?: (id: string) => Promise<void> | void
  onShare?: (id: string, organizationId: string, collectionIds: string[]) => Promise<void> | void
  onUploadAttachment?: (id: string, file: File) => Promise<void> | void
  onDeleteAttachment?: (id: string, attachmentId: string) => Promise<void> | void
}

export function cipherDetailViewStateCreate(props: CipherDetailViewStateProps) {
  const apiClient = cipherApiClientCreate()
  const displayedItem = createSignalObject<CipherItem | null>(props.item())
  const isPasswordRevealed = createSignalObject(false)
  const isCardNumberRevealed = createSignalObject(false)
  const isCvvRevealed = createSignalObject(false)
  const isSsnRevealed = createSignalObject(false)
  const isPassportRevealed = createSignalObject(false)
  const copiedField = createSignalObject<string | null>(null)

  // Dialog open signals
  const isHistoryDialogOpen = createSignalObject(false)
  const isShareDialogOpen = createSignalObject(false)
  const isDeleteDialogOpen = createSignalObject(false)
  const deleteHardMode = createSignalObject(false)

  const isActionLoading = createSignalObject(false)
  const actionErrorMessage = createSignalObject<string | null>(null)

  let copyTimer: ReturnType<typeof setTimeout> | null = null

  const resetTransientState = () => {
    isPasswordRevealed.set(false)
    isCardNumberRevealed.set(false)
    isCvvRevealed.set(false)
    isSsnRevealed.set(false)
    isPassportRevealed.set(false)
    copiedField.set(null)
    if (copyTimer) {
      clearTimeout(copyTimer)
      copyTimer = null
    }
  }

  onCleanup(() => {
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
    resetTransientState()
  })

  const copyToClipboard = (fieldName: string, value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {})
    }
    copiedField.set(fieldName)
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedField.set(null)
      copyTimer = null
    }, 2000)
  }

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

  const isDeleted = createMemo(() => !!displayedItem.get()?.deletedDate)
  const isArchived = createMemo(() => !!displayedItem.get()?.archivedDate)
  const passwordHistoryCount = createMemo(() => displayedItem.get()?.passwordHistory?.length ?? 0)

  const openHistoryDialog = () => isHistoryDialogOpen.set(true)
  const openShareDialog = () => isShareDialogOpen.set(true)

  const openDeleteDialog = (hard: boolean) => {
    deleteHardMode.set(hard)
    isDeleteDialogOpen.set(true)
  }

  const handleConfirmDelete = async () => {
    const it = displayedItem.get()
    if (!it) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      if (props.onDelete) {
        await props.onDelete(it.id, deleteHardMode.get())
      } else {
        const res = deleteHardMode.get() ? await apiClient.hardDelete(it.id) : await apiClient.softDelete(it.id)
        if (!res.success) throw new Error(res.errorMessage)
        if (deleteHardMode.get()) {
          displayedItem.set(null)
        } else {
          const refreshed = await apiClient.get(it.id)
          if (refreshed.success) {
            displayedItem.set(refreshed.data)
          } else {
            displayedItem.set({ ...it, deletedDate: new Date().toISOString() })
          }
        }
      }
      isDeleteDialogOpen.set(false)
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to delete cipher.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleRestore = async () => {
    const it = displayedItem.get()
    if (!it) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      if (props.onRestore) {
        await props.onRestore(it.id)
      } else {
        const res = await apiClient.restore(it.id)
        if (!res.success) throw new Error(res.errorMessage)
        displayedItem.set(res.data)
      }
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to restore cipher.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleToggleArchive = async () => {
    const it = displayedItem.get()
    if (!it) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      if (props.onArchive) {
        await props.onArchive(it.id, !isArchived())
      } else {
        const res = await apiClient.archive(it.id, !isArchived())
        if (!res.success) throw new Error(res.errorMessage)
        displayedItem.set(res.data)
      }
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to update archive status.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleClone = async () => {
    const it = displayedItem.get()
    if (!it) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      if (props.onClone) {
        await props.onClone(it.id)
      } else {
        const res = await apiClient.clone(it.id)
        if (!res.success) throw new Error(res.errorMessage)
        displayedItem.set(res.data)
      }
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to clone cipher.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleShareSubmit = async (organizationId: string, collectionIds: string[]) => {
    const it = displayedItem.get()
    if (!it) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      if (props.onShare) {
        await props.onShare(it.id, organizationId, collectionIds)
      } else {
        const res = it.organizationId
          ? await apiClient.updateCollections(it.id, collectionIds)
          : await apiClient.share(it.id, organizationId, collectionIds, it)
        if (!res.success) throw new Error(res.errorMessage)
        displayedItem.set(res.data)
      }
      isShareDialogOpen.set(false)
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to share cipher.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleUploadAttachment = async (file: File) => {
    const it = displayedItem.get()
    if (!it) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      if (props.onUploadAttachment) {
        await props.onUploadAttachment(it.id, file)
      } else {
        const res = await apiClient.uploadAttachment(it.id, file, file.name)
        if (!res.success) throw new Error(res.errorMessage)
        displayedItem.set(res.data)
      }
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to upload attachment.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    const it = displayedItem.get()
    if (!it) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      if (props.onDeleteAttachment) {
        await props.onDeleteAttachment(it.id, attachmentId)
      } else {
        const res = await apiClient.deleteAttachment(it.id, attachmentId)
        if (!res.success) throw new Error(res.errorMessage)
        const updatedAttachments = (it.attachments ?? []).filter((attachment) => attachment.id !== attachmentId)
        displayedItem.set({
          ...it,
          attachments: updatedAttachments.length > 0 ? updatedAttachments : null,
        })
      }
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to delete attachment.")
    } finally {
      isActionLoading.set(false)
    }
  }

  return {
    item: displayedItem.get,
    itemId: () => displayedItem.get()?.id ?? null,
    isPasswordRevealed: isPasswordRevealed.get,
    isCardNumberRevealed: isCardNumberRevealed.get,
    isCvvRevealed: isCvvRevealed.get,
    isSsnRevealed: isSsnRevealed.get,
    isPassportRevealed: isPassportRevealed.get,
    copiedField: copiedField.get,
    categoryTheme,
    categoryIcon,
    categoryLabel,
    cardBrand,
    formattedCardNumber,
    formattedIdentityFullName,
    formattedIdentityAddress,
    customFields,
    isDeleted,
    isArchived,
    passwordHistoryCount,
    isHistoryDialogOpen,
    isShareDialogOpen,
    isDeleteDialogOpen,
    deleteHardMode: deleteHardMode.get,
    isActionLoading: isActionLoading.get,
    actionErrorMessage: actionErrorMessage.get,
    copyToClipboard,
    togglePasswordReveal,
    toggleCardNumberReveal,
    toggleCvvReveal,
    toggleSsnReveal,
    togglePassportReveal,
    openHistoryDialog,
    openShareDialog,
    openDeleteDialog,
    handleConfirmDelete,
    handleRestore,
    handleToggleArchive,
    handleClone,
    handleShareSubmit,
    handleUploadAttachment,
    handleDeleteAttachment,
    toggleFavorite: async () => {
      const it = displayedItem.get()
      if (!it) return
      if (props.onToggleFavorite) {
        await props.onToggleFavorite(it.id)
      } else {
        const res = await apiClient.favorite(it.id, !it.favorite)
        if (!res.success) throw new Error(res.errorMessage)
        displayedItem.set({ ...it, favorite: !it.favorite })
      }
    },
    editItem: () => {
      const it = displayedItem.get()
      if (it && props.onEdit) props.onEdit(it.id)
    },
  }
}
