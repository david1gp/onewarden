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

  createEffect(() => {
    if (props.initialMode) {
      mode.set(props.initialMode())
    }
  })

  const loadCipher = async (id: string) => {
    currentItem.set(null)
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

  createEffect(() => {
    const id = props.cipherId?.()
    if (id) {
      void loadCipher(id)
      return
    }
    currentItem.set(null)
    isLoading.set(false)
  })

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
      mode.set("view")
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
    if (hard) {
      currentItem.set(null)
      props.onNavigateBack?.()
      return
    }
    const refreshed = await apiClient.get(id)
    if (refreshed.success) {
      currentItem.set(refreshed.data)
      return
    }
    errorMessage.set(refreshed.errorMessage)
    throw new Error(refreshed.errorMessage)
  }

  const handleRestore = async (id: string): Promise<void> => {
    const result = await apiClient.restore(id)
    if (result.success) {
      currentItem.set(result.data)
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleArchive = async (id: string, archived: boolean): Promise<void> => {
    const result = await apiClient.archive(id, archived)
    if (result.success) {
      currentItem.set(result.data)
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleClone = async (id: string): Promise<void> => {
    const result = await apiClient.clone(id)
    if (result.success) {
      currentItem.set(result.data)
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
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleUploadAttachment = async (id: string, file: File): Promise<void> => {
    const result = await apiClient.uploadAttachment(id, file, file.name)
    if (result.success) {
      currentItem.set(result.data)
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
        currentItem.set({
          ...current,
          attachments: updatedAttachments.length > 0 ? updatedAttachments : null,
        })
      }
      return
    }
    errorMessage.set(result.errorMessage)
    throw new Error(result.errorMessage)
  }

  const handleCancel = () => {
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
