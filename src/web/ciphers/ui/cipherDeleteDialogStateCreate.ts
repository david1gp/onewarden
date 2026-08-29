import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export interface CipherDeleteDialogStateProps {
  openSignal?: SignalObject<boolean>
  item: () => CipherItem | null
  hardDelete?: boolean
  onConfirm?: () => Promise<void> | void
  onClose?: () => void
}

export function cipherDeleteDialogStateCreate(props: CipherDeleteDialogStateProps) {
  const internalOpen = createSignalObject(false)
  const openSignal = props.openSignal ?? internalOpen

  const isDeleting = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)

  const handleOpenChange = (open: boolean) => {
    openSignal.set(open)
    if (!open) {
      errorMessage.set(null)
      if (props.onClose) props.onClose()
    }
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  const handleConfirm = async () => {
    if (!props.onConfirm) return

    isDeleting.set(true)
    errorMessage.set(null)
    try {
      await props.onConfirm()
      handleClose()
    } catch (err: any) {
      errorMessage.set(err?.message ?? "Failed to delete cipher.")
    } finally {
      isDeleting.set(false)
    }
  }

  const isHard = () => props.hardDelete ?? false
  const itemName = () => props.item()?.name ?? "this cipher"

  return {
    isOpen: openSignal.get,
    isDeleting: isDeleting.get,
    errorMessage: errorMessage.get,
    isHard,
    itemName,
    handleOpenChange,
    handleClose,
    handleConfirm,
  }
}
