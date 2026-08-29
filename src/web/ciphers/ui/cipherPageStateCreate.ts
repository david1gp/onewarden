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

  createEffect(() => {
    const id = props.cipherId?.()
    if (id) {
      loadCipher(id)
    }
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

  const handleToggleFavorite = async (id: string) => {
    const item = currentItem.get()
    if (!item) return
    const newFav = !item.favorite
    currentItem.set({ ...item, favorite: newFav })
    await apiClient.favorite(id, newFav)
  }

  const handleDelete = async (id: string, hard: boolean) => {
    const result = hard ? await apiClient.hardDelete(id) : await apiClient.softDelete(id)
    if (result.success) {
      if (props.onNavigateBack) {
        props.onNavigateBack()
      }
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  const handleRestore = async (id: string) => {
    const result = await apiClient.restore(id)
    if (result.success) {
      currentItem.set(result.data)
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  const handleArchive = async (id: string, archived: boolean) => {
    const result = await apiClient.archive(id, archived)
    if (result.success) {
      currentItem.set(result.data)
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  const handleClone = async (id: string) => {
    const result = await apiClient.clone(id)
    if (result.success) {
      currentItem.set(result.data)
      mode.set("view")
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  const handleShare = async (id: string, organizationId: string, collectionIds: string[]) => {
    const item = currentItem.get()
    if (!item) return
    const result = item.organizationId
      ? await apiClient.updateCollections(id, collectionIds)
      : await apiClient.share(id, organizationId, collectionIds, item)
    if (result.success) {
      currentItem.set(result.data)
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  const handleUploadAttachment = async (id: string, file: File) => {
    const result = await apiClient.uploadAttachment(id, file, file.name)
    if (result.success) {
      currentItem.set(result.data)
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  const handleDeleteAttachment = async (id: string, attachmentId: string) => {
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
    } else {
      errorMessage.set(result.errorMessage)
    }
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
