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
  let loadRequestId = 0
  let mutationRequestId = 0

  const mutationRequestBegin = () => {
    mutationRequestId += 1
    return mutationRequestId
  }

  const mutationRequestIsCurrent = (requestId: number, cipherId?: string) => {
    if (requestId !== mutationRequestId) return false
    return cipherId === undefined || currentItem.get()?.id === cipherId
  }

  const mutationErrorThrow = (requestId: number, error: unknown, fallbackMessage: string) => {
    if (!mutationRequestIsCurrent(requestId)) return
    const message = error instanceof Error ? error.message : fallbackMessage
    errorMessage.set(message)
    throw new Error(message)
  }

  // Sync with prop changes
  createEffect(() => {
    if (props.mode) {
      mode.set(props.mode())
    }
  })

  createEffect(() => {
    if (props.initialItem) {
      currentItem.set(props.initialItem())
      mutationRequestBegin()
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
    const requestId = ++loadRequestId
    mutationRequestBegin()
    isLoading.set(true)
    errorMessage.set(null)
    const result = await apiClient.get(id)
    if (requestId !== loadRequestId) return
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
      loadRequestId += 1
      mutationRequestBegin()
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
    const requestId = mutationRequestBegin()
    isSaving.set(true)
    errorMessage.set(null)
    try {
      const item = currentItem.get()
      const isEdit = mode.get() === "edit" && item !== null
      const result = isEdit ? await apiClient.update(item.id, formData) : await apiClient.create(formData)
      if (!mutationRequestIsCurrent(requestId, isEdit ? item.id : undefined)) return
      if (!result.success) {
        errorMessage.set(result.errorMessage)
        return
      }
      currentItem.set(result.data)
      if (props.onSaved) await props.onSaved(result.data)
      handleClose()
    } catch (error) {
      if (!mutationRequestIsCurrent(requestId)) return
      errorMessage.set(error instanceof Error ? error.message : "Failed to save cipher.")
    } finally {
      if (requestId === mutationRequestId) isSaving.set(false)
    }
  }

  const handleToggleFavorite = async (id: string): Promise<void> => {
    const item = currentItem.get()
    if (!item || item.id !== id) return
    const requestId = mutationRequestBegin()
    const newFav = !item.favorite
    currentItem.set({ ...item, favorite: newFav })
    try {
      const result = await apiClient.favorite(id, newFav)
      if (!mutationRequestIsCurrent(requestId, id)) return
      if (!result.success) {
        currentItem.set(item)
        mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
      }
    } catch (error) {
      if (!mutationRequestIsCurrent(requestId, id)) return
      currentItem.set(item)
      mutationErrorThrow(requestId, error, "Failed to update favorite status.")
    }
  }

  const handleDelete = async (id: string, hard: boolean): Promise<void> => {
    const requestId = mutationRequestBegin()
    try {
      const result = hard ? await apiClient.hardDelete(id) : await apiClient.softDelete(id)
      if (!mutationRequestIsCurrent(requestId, id)) return
      if (!result.success) mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
      if (props.onDeleted) await props.onDeleted(id, hard)
      if (!mutationRequestIsCurrent(requestId, id)) return
      handleClose()
    } catch (error) {
      mutationErrorThrow(requestId, error, "Failed to delete cipher.")
    }
  }

  const handleRestore = async (id: string): Promise<void> => {
    const requestId = mutationRequestBegin()
    try {
      const result = await apiClient.restore(id)
      if (!mutationRequestIsCurrent(requestId, id)) return
      if (result.success) {
        currentItem.set(result.data)
        if (props.onSaved) await props.onSaved(result.data)
        return
      }
      mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
    } catch (error) {
      mutationErrorThrow(requestId, error, "Failed to restore cipher.")
    }
  }

  const handleArchive = async (id: string, archived: boolean): Promise<void> => {
    const requestId = mutationRequestBegin()
    try {
      const result = await apiClient.archive(id, archived)
      if (!mutationRequestIsCurrent(requestId, id)) return
      if (result.success) {
        currentItem.set(result.data)
        if (props.onSaved) await props.onSaved(result.data)
        return
      }
      mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
    } catch (error) {
      mutationErrorThrow(requestId, error, "Failed to update archive status.")
    }
  }

  const handleClone = async (id: string): Promise<void> => {
    const requestId = mutationRequestBegin()
    try {
      const result = await apiClient.clone(id)
      if (!mutationRequestIsCurrent(requestId, id)) return
      if (result.success) {
        currentItem.set(result.data)
        if (props.onSaved) await props.onSaved(result.data)
        mode.set("view")
        return
      }
      mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
    } catch (error) {
      mutationErrorThrow(requestId, error, "Failed to clone cipher.")
    }
  }

  const handleShare = async (id: string, organizationId: string, collectionIds: string[]): Promise<void> => {
    const item = currentItem.get()
    if (!item || item.id !== id) return
    const requestId = mutationRequestBegin()
    try {
      const result = item.organizationId
        ? await apiClient.updateCollections(id, collectionIds)
        : await apiClient.share(id, organizationId, collectionIds, item)
      if (!mutationRequestIsCurrent(requestId, id)) return
      if (result.success) {
        currentItem.set(result.data)
        if (props.onSaved) await props.onSaved(result.data)
        return
      }
      mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
    } catch (error) {
      mutationErrorThrow(requestId, error, "Failed to share cipher.")
    }
  }

  const handleUploadAttachment = async (id: string, file: File): Promise<void> => {
    const requestId = mutationRequestBegin()
    try {
      const result = await apiClient.uploadAttachment(id, file, file.name)
      if (!mutationRequestIsCurrent(requestId, id)) return
      if (result.success) {
        currentItem.set(result.data)
        if (props.onSaved) await props.onSaved(result.data)
        return
      }
      mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
    } catch (error) {
      mutationErrorThrow(requestId, error, "Failed to upload attachment.")
    }
  }

  const handleDeleteAttachment = async (id: string, attachmentId: string): Promise<void> => {
    const requestId = mutationRequestBegin()
    try {
      const result = await apiClient.deleteAttachment(id, attachmentId)
      if (!mutationRequestIsCurrent(requestId, id)) return
      if (result.success) {
        const current = currentItem.get()
        if (current) {
          const updatedAttachments = (current.attachments ?? []).filter((a) => a.id !== attachmentId)
          const updatedItem = {
            ...current,
            attachments: updatedAttachments.length > 0 ? updatedAttachments : null,
          }
          currentItem.set(updatedItem)
          if (props.onSaved) await props.onSaved(updatedItem)
        }
        return
      }
      mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
    } catch (error) {
      mutationErrorThrow(requestId, error, "Failed to delete attachment.")
    }
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
