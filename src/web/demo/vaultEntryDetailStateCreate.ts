import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { cipherItemFromDemo } from "../ciphers/model/cipherItemFromDemo.js"
import type { CipherItem } from "../ciphers/schemas/cipherItemSchema.js"
import type { VaultCollection } from "../vault/model/vaultCollectionSchema.js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultEntryDetailStateProps {
  item: () => VaultItem | null
  cipherItem?: () => CipherItem | null
  collections?: () => readonly VaultCollection[]
  enableFavoriteAction?: boolean
  onToggleFavorite?: (id: string) => unknown
  onEdit?: (id: string) => void
  onDelete?: (id: string, hard: boolean) => Promise<void> | void
  onMoveToTrash?: (id: string) => unknown
  onRestore?: (id: string) => Promise<void> | void
  onArchive?: (id: string, archived: boolean) => Promise<void> | void
  onClone?: (id: string) => Promise<void> | void
  onShare?: (id: string, organizationId: string, collectionIds: string[]) => Promise<void> | void
  onUploadAttachment?: (id: string, file: File) => Promise<void> | void
  onDeleteAttachment?: (id: string, attachmentId: string) => Promise<void> | void
}

export function vaultEntryDetailStateCreate(props: VaultEntryDetailStateProps) {
  const isTrashDialogOpen = createSignalObject(false)

  const cipherItem = createMemo<CipherItem | null>(() => {
    const provided = props.cipherItem?.()
    if (provided) return provided
    const raw = props.item()
    if (!raw) return null
    return cipherItemFromDemo(raw)
  })

  const cloneItem = async (id?: string): Promise<void> => {
    const targetId = id ?? props.item()?.id
    if (!targetId || !props.onClone) return
    await props.onClone(targetId)
  }

  const openTrashDialog = () => {
    if (props.item()) isTrashDialogOpen.set(true)
  }

  const closeTrashDialog = () => isTrashDialogOpen.set(false)

  const confirmMoveToTrash = async (): Promise<void> => {
    const item = props.item()
    if (!item) {
      closeTrashDialog()
      return
    }

    const moveToTrash = props.onMoveToTrash ? props.onMoveToTrash(item.id) : props.onDelete?.(item.id, false)
    closeTrashDialog()
    await moveToTrash
  }

  return {
    cipherItem,
    collections: () => props.collections?.() ?? [],
    toggleFavorite: async () => {
      if (!props.enableFavoriteAction) return
      const item = props.item()
      if (item && props.onToggleFavorite) await props.onToggleFavorite(item.id)
    },
    editItem: () => {
      const item = props.item()
      if (item && props.onEdit) props.onEdit(item.id)
    },
    deleteItem: props.onDelete,
    restoreItem: props.onRestore,
    archiveItem: props.onArchive,
    cloneItem,
    handleClone: () => cloneItem(),
    shareItem: props.onShare,
    uploadAttachment: props.onUploadAttachment,
    deleteAttachment: props.onDeleteAttachment,
    isTrashDialogOpen: isTrashDialogOpen.get,
    openTrashDialog,
    closeTrashDialog,
    confirmMoveToTrash,
  }
}
