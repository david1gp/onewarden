import { createEffect } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export interface CipherShareDialogStateProps {
  openSignal?: SignalObject<boolean>
  item: () => CipherItem | null
  onShare?: (organizationId: string, collectionIds: string[]) => Promise<void> | void
  onClose?: () => void
}

export function cipherShareDialogStateCreate(props: CipherShareDialogStateProps) {
  const internalOpen = createSignalObject(false)
  const openSignal = props.openSignal ?? internalOpen

  const organizationId = createSignalObject(props.item()?.organizationId ?? "")
  const collectionIdsText = createSignalObject(props.item()?.collectionIds?.join(", ") ?? "")
  const isSharing = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)

  createEffect(() => {
    const it = props.item()
    if (it) {
      organizationId.set(it.organizationId ?? "")
      collectionIdsText.set(it.collectionIds?.join(", ") ?? "")
    }
  })

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

  const handleShare = async (e?: Event) => {
    if (e) e.preventDefault()
    const orgId = organizationId.get().trim()
    if (!orgId) {
      errorMessage.set("Organization ID is required.")
      return
    }

    const rawCollections = collectionIdsText.get()
    const collections = rawCollections
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)

    if (collections.length === 0) {
      errorMessage.set("At least one Collection ID is required.")
      return
    }

    if (!props.onShare) return

    isSharing.set(true)
    errorMessage.set(null)
    try {
      await props.onShare(orgId, collections)
      handleClose()
    } catch (err: any) {
      errorMessage.set(err?.message ?? "Failed to share cipher to organization.")
    } finally {
      isSharing.set(false)
    }
  }

  return {
    isOpen: openSignal.get,
    organizationId,
    collectionIdsText,
    isSharing: isSharing.get,
    errorMessage: errorMessage.get,
    itemName: () => props.item()?.name ?? "Cipher",
    isAlreadyShared: () => !!props.item()?.organizationId,
    handleOpenChange,
    handleClose,
    handleShare,
  }
}
