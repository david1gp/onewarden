import { createMemo, onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { cipherCardBrandDetect } from "../model/cipherCardBrandDetect.js"
import { cipherCardFormat } from "../model/cipherCardFormat.js"
import { cipherCategoryIconResolve } from "../model/cipherCategoryIconResolve.js"
import { cipherCategoryLabelResolve } from "../model/cipherCategoryLabelResolve.js"
import { cipherCategoryThemeResolve } from "../model/cipherCategoryThemeResolve.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export interface CipherDetailViewStateProps {
  item: () => CipherItem | null
  onToggleFavorite?: (id: string) => void
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

  onCleanup(() => {
    if (copyTimer) clearTimeout(copyTimer)
  })

  const copyToClipboard = (fieldName: string, value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {})
    }
    copiedField.set(fieldName)
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedField.set(null)
    }, 2000)
  }

  const togglePasswordReveal = () => isPasswordRevealed.set(!isPasswordRevealed.get())
  const toggleCardNumberReveal = () => isCardNumberRevealed.set(!isCardNumberRevealed.get())
  const toggleCvvReveal = () => isCvvRevealed.set(!isCvvRevealed.get())
  const toggleSsnReveal = () => isSsnRevealed.set(!isSsnRevealed.get())
  const togglePassportReveal = () => isPassportRevealed.set(!isPassportRevealed.get())

  const categoryTheme = createMemo(() => {
    const item = props.item()
    return cipherCategoryThemeResolve(item ? item.type : 1)
  })

  const categoryIcon = createMemo(() => {
    const item = props.item()
    return cipherCategoryIconResolve(item ? item.type : 1)
  })

  const categoryLabel = createMemo(() => {
    const item = props.item()
    return cipherCategoryLabelResolve(item ? item.type : 1)
  })

  const cardBrand = createMemo(() => {
    const item = props.item()
    if (item?.card?.brand) return item.card.brand
    return cipherCardBrandDetect(item?.card?.number)
  })

  const formattedCardNumber = createMemo(() => {
    const item = props.item()
    return cipherCardFormat(item?.card?.number, !isCardNumberRevealed.get())
  })

  const formattedIdentityFullName = createMemo(() => {
    const ident = props.item()?.identity
    if (!ident) return ""
    const parts = [ident.title, ident.firstName, ident.middleName, ident.lastName].filter(Boolean)
    return parts.join(" ")
  })

  const formattedIdentityAddress = createMemo(() => {
    const ident = props.item()?.identity
    if (!ident) return ""
    const street = [ident.address1, ident.address2, ident.address3].filter(Boolean).join(", ")
    const region = [ident.city, ident.state, ident.postalCode].filter(Boolean).join(" ")
    const parts = [street, region, ident.country].filter(Boolean)
    return parts.join("\n")
  })

  const customFields = () => props.item()?.fields ?? []

  const isDeleted = createMemo(() => !!props.item()?.deletedDate)
  const isArchived = createMemo(() => !!props.item()?.archivedDate)
  const passwordHistoryCount = createMemo(() => props.item()?.passwordHistory?.length ?? 0)

  const openHistoryDialog = () => isHistoryDialogOpen.set(true)
  const openShareDialog = () => isShareDialogOpen.set(true)

  const openDeleteDialog = (hard: boolean) => {
    deleteHardMode.set(hard)
    isDeleteDialogOpen.set(true)
  }

  const handleConfirmDelete = async () => {
    const it = props.item()
    if (!it || !props.onDelete) return
    await props.onDelete(it.id, deleteHardMode.get())
  }

  const handleRestore = async () => {
    const it = props.item()
    if (!it || !props.onRestore) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await props.onRestore(it.id)
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to restore cipher.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleToggleArchive = async () => {
    const it = props.item()
    if (!it || !props.onArchive) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await props.onArchive(it.id, !isArchived())
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to update archive status.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleClone = async () => {
    const it = props.item()
    if (!it || !props.onClone) return
    isActionLoading.set(true)
    actionErrorMessage.set(null)
    try {
      await props.onClone(it.id)
    } catch (err: any) {
      actionErrorMessage.set(err?.message ?? "Failed to clone cipher.")
    } finally {
      isActionLoading.set(false)
    }
  }

  const handleShareSubmit = async (organizationId: string, collectionIds: string[]) => {
    const it = props.item()
    if (!it || !props.onShare) return
    await props.onShare(it.id, organizationId, collectionIds)
  }

  const handleUploadAttachment = async (file: File) => {
    const it = props.item()
    if (!it || !props.onUploadAttachment) return
    await props.onUploadAttachment(it.id, file)
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    const it = props.item()
    if (!it || !props.onDeleteAttachment) return
    await props.onDeleteAttachment(it.id, attachmentId)
  }

  return {
    item: props.item,
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
    toggleFavorite: () => {
      const it = props.item()
      if (it && props.onToggleFavorite) props.onToggleFavorite(it.id)
    },
    editItem: () => {
      const it = props.item()
      if (it && props.onEdit) props.onEdit(it.id)
    },
  }
}
