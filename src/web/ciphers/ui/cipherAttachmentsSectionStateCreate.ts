import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { cipherAttachmentFormatSize } from "../model/cipherAttachmentFormatSize.js"
import type { CipherAttachment } from "../schemas/cipherAttachmentSchema.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export interface CipherAttachmentsSectionStateProps {
  item: () => CipherItem | null
  onUploadAttachment?: (file: File) => Promise<void> | void
  onDeleteAttachment?: (attachmentId: string) => Promise<void> | void
  readOnly?: () => boolean
  canDelete?: () => boolean
}

export function cipherAttachmentsSectionStateCreate(props: CipherAttachmentsSectionStateProps) {
  let fileInputRef: HTMLInputElement | undefined

  const isUploading = createSignalObject(false)
  const deletingId = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)

  const attachments = createMemo<CipherAttachment[]>(() => {
    return props.item()?.attachments ?? []
  })

  const hasAttachments = createMemo(() => attachments().length > 0)

  const triggerFileInput = () => {
    errorMessage.set(null)
    fileInputRef?.click()
  }

  const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !props.onUploadAttachment) return

    isUploading.set(true)
    errorMessage.set(null)
    try {
      await props.onUploadAttachment(file)
    } catch (err: any) {
      errorMessage.set(err?.message ?? "Failed to upload attachment.")
    } finally {
      isUploading.set(false)
      input.value = ""
    }
  }

  const handleDelete = async (attachmentId: string) => {
    if (!props.onDeleteAttachment) return
    deletingId.set(attachmentId)
    errorMessage.set(null)
    try {
      await props.onDeleteAttachment(attachmentId)
    } catch (err: any) {
      errorMessage.set(err?.message ?? "Failed to delete attachment.")
    } finally {
      deletingId.set(null)
    }
  }

  const formatSize = (attachment: CipherAttachment) => {
    if (attachment.sizeName) return attachment.sizeName
    return cipherAttachmentFormatSize(attachment.size)
  }

  return {
    attachments,
    hasAttachments,
    isUploading: isUploading.get,
    deletingId: deletingId.get,
    errorMessage: errorMessage.get,
    readOnly: props.readOnly ?? (() => false),
    canDelete: props.canDelete ?? (() => !props.readOnly?.()),
    triggerFileInput,
    handleFileChange,
    handleDelete,
    formatSize,
    setFileInputRef: (el: HTMLInputElement) => {
      fileInputRef = el
    },
  }
}
