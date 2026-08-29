import { createEffect, onCleanup } from "solid-js"
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
  let requestId = 0
  let previousItemId = props.item()?.id ?? null
  let previousOpen = openSignal.get()

  const requestInvalidate = () => {
    requestId += 1
    isDeleting.set(false)
    errorMessage.set(null)
  }

  createEffect(() => {
    const itemId = props.item()?.id ?? null
    const isOpen = openSignal.get()
    const itemChanged = itemId !== previousItemId
    const closed = previousOpen && !isOpen
    previousItemId = itemId
    previousOpen = isOpen

    if (!itemChanged && !closed) return
    requestInvalidate()
    if (itemChanged && isOpen) openSignal.set(false)
  })

  onCleanup(requestInvalidate)

  const handleOpenChange = (open: boolean) => {
    openSignal.set(open)
    if (!open) {
      requestInvalidate()
      errorMessage.set(null)
      if (props.onClose) props.onClose()
    }
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  const handleConfirm = async () => {
    if (!props.onConfirm || isDeleting.get()) return

    isDeleting.set(true)
    errorMessage.set(null)
    const currentRequestId = ++requestId
    try {
      await props.onConfirm()
      if (currentRequestId !== requestId) return
      handleClose()
    } catch (err: any) {
      if (currentRequestId !== requestId) return
      errorMessage.set(err?.message ?? "Failed to delete cipher.")
    } finally {
      if (currentRequestId === requestId) isDeleting.set(false)
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
