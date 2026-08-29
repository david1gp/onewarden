import type { JSX } from "solid-js"
import { CipherDetailView } from "../ciphers/ui/CipherDetailView.jsx"
import { type VaultEntryDetailStateProps, vaultEntryDetailStateCreate } from "./vaultEntryDetailStateCreate.js"

export function VaultEntryDetail(props: VaultEntryDetailStateProps): JSX.Element {
  const state = vaultEntryDetailStateCreate(props)

  return (
    <CipherDetailView
      item={state.cipherItem}
      onToggleFavorite={state.toggleFavorite}
      onEdit={state.editItem}
      onDelete={state.deleteItem}
      onRestore={state.restoreItem}
      onArchive={state.archiveItem}
      onClone={state.cloneItem}
      onShare={state.shareItem}
      onUploadAttachment={(id, file) => state.uploadAttachment?.(id, file)}
      onDeleteAttachment={(id, attachmentId) => state.deleteAttachment?.(id, attachmentId)}
    />
  )
}
