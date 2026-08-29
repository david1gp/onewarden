import { createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { cipherApiClientCreate } from "../actions/cipherApiClientCreate.js"
import type { CipherDialogMode } from "../schemas/cipherDialogModeSchema.js"
import type { CipherFormData } from "../schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"

export interface CipherPageStateProps {
  cipherId?: () => string | null
  initialMode?: () => CipherDialogMode
  defaultType?: () => CipherType | undefined
  onNavigateBack?: () => void
}

export function cipherPageStateCreate(props: CipherPageStateProps) {
  const apiClient = cipherApiClientCreate()

  const mode = createSignalObject<CipherDialogMode>(props.initialMode ? props.initialMode() : "view")
  const currentItem = createSignalObject<CipherItem | null>(null)
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

  createEffect(() => {
    if (props.initialMode) {
      mode.set(props.initialMode())
    }
  })

  const loadCipher = async (id: string) => {
    const requestId = ++loadRequestId
    mutationRequestBegin()
    currentItem.set(null)
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

  createEffect(() => {
    const id = props.cipherId?.()
    if (id) {
      void loadCipher(id)
      return
    }
    currentItem.set(null)
    loadRequestId += 1
    mutationRequestBegin()
    isLoading.set(false)
  })

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
      mode.set("view")
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
      if (!result.success) {
        mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
      }
      if (hard) {
        currentItem.set(null)
        props.onNavigateBack?.()
        return
      }
      const refreshRequestId = ++loadRequestId
      const refreshed = await apiClient.get(id)
      if (refreshRequestId !== loadRequestId || !mutationRequestIsCurrent(requestId, id)) return
      if (refreshed.success) {
        currentItem.set(refreshed.data)
        return
      }
      mutationErrorThrow(requestId, new Error(refreshed.errorMessage), refreshed.errorMessage)
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
          currentItem.set({
            ...current,
            attachments: updatedAttachments.length > 0 ? updatedAttachments : null,
          })
        }
        return
      }
      mutationErrorThrow(requestId, new Error(result.errorMessage), result.errorMessage)
    } catch (error) {
      mutationErrorThrow(requestId, error, "Failed to delete attachment.")
    }
  }

  const handleCancel = () => {
    mutationRequestBegin()
    if (mode.get() === "edit") {
      mode.set("view")
    } else if (props.onNavigateBack) {
      props.onNavigateBack()
    }
  }

  return {
    mode: mode.get,
    currentItem: currentItem.get,
    isLoading: isLoading.get,
    isSaving: isSaving.get,
    errorMessage: errorMessage.get,
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
    handleCancel,
  }
}
