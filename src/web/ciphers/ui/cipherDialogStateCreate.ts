import { createEffect, createMemo } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { cipherApiClientCreate } from "../actions/cipherApiClientCreate.js"
import type { CipherDialogMode } from "../schemas/cipherDialogModeSchema.js"
import type { CipherFormData } from "../schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"

export interface CipherDialogStateProps {
  openSignal?: SignalObject<boolean>
  mode?: () => CipherDialogMode
  cipherId?: () => string | null
  initialItem?: () => CipherItem | null
  defaultType?: () => CipherType | undefined
  onSaved?: (item: CipherItem) => Promise<void> | void
  onDeleted?: (id: string, hard: boolean) => Promise<void> | void
  onClosed?: () => void
  syncUrl?: boolean
}

export function cipherDialogStateCreate(props: CipherDialogStateProps) {
  const apiClient = cipherApiClientCreate()

  const internalOpen = createSignalObject(false)
  const openSignal = props.openSignal ?? internalOpen

  const mode = createSignalObject<CipherDialogMode>(props.mode ? props.mode() : "view")
  const currentItem = createSignalObject<CipherItem | null>(props.initialItem ? props.initialItem() : null)
  const isLoading = createSignalObject(false)
  const isSaving = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)

  // Sync with prop changes
  createEffect(() => {
    if (props.mode) {
      mode.set(props.mode())
    }
  })

  createEffect(() => {
    if (props.initialItem) {
      currentItem.set(props.initialItem())
    }
  })

  // Load cipher item if cipherId changes and mode is view or edit
  createEffect(() => {
    const id = props.cipherId?.()
    if (id && openSignal.get() && (!currentItem.get() || currentItem.get()?.id !== id)) {
      loadCipher(id)
    }
  })

  // URL sync handling
  const syncUrlState = (isOpen: boolean, currentMode: CipherDialogMode, id: string | null) => {
    if (!props.syncUrl || typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (isOpen) {
      url.searchParams.set("dialog", currentMode === "create" ? "cipherCreate" : "cipher")
      if (id) {
        url.searchParams.set("cipherId", id)
      } else {
        url.searchParams.delete("cipherId")
      }
    } else {
      url.searchParams.delete("dialog")
      url.searchParams.delete("cipherId")
    }
    window.history.replaceState(null, "", url.toString())
  }

  createEffect(() => {
    syncUrlState(openSignal.get(), mode.get(), currentItem.get()?.id ?? props.cipherId?.() ?? null)
  })

  const loadCipher = async (id: string) => {
    isLoading.set(true)
    errorMessage.set(null)
    const result = await apiClient.get(id)
    isLoading.set(false)
    if (result.success) {
      currentItem.set(result.data)
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  const handleOpenChange = (open: boolean) => {
    openSignal.set(open)
    if (!open) {
      errorMessage.set(null)
      if (props.onClosed) props.onClosed()
    }
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  const handleSwitchToEdit = () => {
    mode.set("edit")
  }

  const handleSave = async (formData: CipherFormData) => {
    isSaving.set(true)
    errorMessage.set(null)

    const item = currentItem.get()
    const isEdit = mode.get() === "edit" && item !== null

    const result = isEdit ? await apiClient.update(item.id, formData) : await apiClient.create(formData)

    isSaving.set(false)
    if (result.success) {
      currentItem.set(result.data)
      if (props.onSaved) await props.onSaved(result.data)
      handleClose()
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  const handleToggleFavorite = async (id: string): Promise<void> => {
    const item = currentItem.get()
    if (!item) return
    const newFav = !item.favorite
    currentItem.set({ ...item, favorite: newFav })
    const result = await apiClient.favorite(id, newFav)
    if (!result.success) {
      currentItem.set(item)
      errorMessage.set(result.errorMessage)
      throw new Error(result.errorMessage)
    }
  }

  const handleDelete = async (id: string, hard: boolean): Promise<void> => {
    const result = hard ? await apiClient.hardDelete(id) : await apiClient.softDelete(id)
    if (!result.success) {
      errorMessage.set(result.errorMessage)
      throw new Error(result.errorMessage)
    }
    if (props.onDeleted) await props.onDeleted(id, hard)
    handleClose()
  }

  const handleRestore = async (id: string): Promise<void> => {
    const result = await apiClient.restore(id)
    if (result.success) {
      currentItem.set(result.data)
      if (props.onSaved) props.onSaved(result.data)
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleArchive = async (id: string, archived: boolean): Promise<void> => {
    const result = await apiClient.archive(id, archived)
    if (result.success) {
      currentItem.set(result.data)
      if (props.onSaved) props.onSaved(result.data)
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleClone = async (id: string): Promise<void> => {
    const result = await apiClient.clone(id)
    if (result.success) {
      currentItem.set(result.data)
      if (props.onSaved) props.onSaved(result.data)
      mode.set("view")
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleShare = async (id: string, organizationId: string, collectionIds: string[]): Promise<void> => {
    const item = currentItem.get()
    if (!item) return
    const result = item.organizationId
      ? await apiClient.updateCollections(id, collectionIds)
      : await apiClient.share(id, organizationId, collectionIds, item)
    if (result.success) {
      currentItem.set(result.data)
      if (props.onSaved) props.onSaved(result.data)
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleUploadAttachment = async (id: string, file: File): Promise<void> => {
    const result = await apiClient.uploadAttachment(id, file, file.name)
    if (result.success) {
      currentItem.set(result.data)
      if (props.onSaved) props.onSaved(result.data)
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleDeleteAttachment = async (id: string, attachmentId: string): Promise<void> => {
    const result = await apiClient.deleteAttachment(id, attachmentId)
    if (result.success) {
      const current = currentItem.get()
      if (current) {
        const updatedAttachments = (current.attachments ?? []).filter((a) => a.id !== attachmentId)
        const updatedItem = {
          ...current,
          attachments: updatedAttachments.length > 0 ? updatedAttachments : null,
        }
        currentItem.set(updatedItem)
        if (props.onSaved) props.onSaved(updatedItem)
      }
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const dialogTitle = createMemo(() => {
    const currentMode = mode.get()
    if (currentMode === "create") return "Add New Cipher Item"
    if (currentMode === "edit") return `Edit ${currentItem.get()?.name ?? "Cipher"}`
    return currentItem.get()?.name ?? "Cipher Details"
  })

  return {
    isOpen: openSignal.get,
    mode: mode.get,
    currentItem: currentItem.get,
    isLoading: isLoading.get,
    isSaving: isSaving.get,
    errorMessage: errorMessage.get,
    dialogTitle,
    handleOpenChange,
    handleClose,
    handleSwitchToEdit,
    handleSave,
    handleToggleFavorite,
    handleDelete,
    handleRestore,
    handleArchive,
    handleClone,
    handleShare,
    handleUploadAttachment,
    handleDeleteAttachment,
  }
}
