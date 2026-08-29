import { createMemo } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"
import type { CipherPasswordHistoryEntry } from "../schemas/cipherPasswordHistoryEntrySchema.js"

export interface CipherPasswordHistoryDialogStateProps {
  openSignal?: SignalObject<boolean>
  item: () => CipherItem | null
  onClose?: () => void
}

export function cipherPasswordHistoryDialogStateCreate(props: CipherPasswordHistoryDialogStateProps) {
  const internalOpen = createSignalObject(false)
  const openSignal = props.openSignal ?? internalOpen

  const entries = createMemo<CipherPasswordHistoryEntry[]>(() => {
    const cipher = props.item()
    return cipher?.passwordHistory ?? []
  })

  const count = createMemo(() => entries().length)

  const handleOpenChange = (open: boolean) => {
    openSignal.set(open)
    if (!open && props.onClose) {
      props.onClose()
    }
  }

  const handleClose = () => {
    handleOpenChange(false)
  }

  return {
    isOpen: openSignal.get,
    entries,
    count,
    handleOpenChange,
    handleClose,
  }
}
