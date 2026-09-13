import type { JSX } from "solid-js"
import { WebCipherDetailView } from "../ciphers/ui/WebCipherDetailView.jsx"
import { type VaultEntryDetailStateProps, vaultEntryDetailStateCreate } from "./vaultEntryDetailStateCreate.js"

export function VaultEntryDetail(props: VaultEntryDetailStateProps): JSX.Element {
  const state = vaultEntryDetailStateCreate(props)

  return (
    <WebCipherDetailView
      item={state.cipherItem}
      collections={state.collections}
      actions={{
        copyToClipboard: props.copyToClipboard,
        toggleFavorite: state.toggleFavorite,
        delete: state.deleteItem ?? (() => undefined),
        restore: state.restoreItem ?? (() => undefined),
        archive: state.archiveItem ?? (() => undefined),
        clone: state.cloneItem,
        share: state.shareItem ?? (() => undefined),
        uploadAttachment: state.uploadAttachment ?? (() => undefined),
        deleteAttachment: state.deleteAttachment ?? (() => undefined),
      }}
      onEdit={state.editItem}
      fillAvailable={props.fillAvailable}
      onFill={(id) => {
        const item = state.cipherItem()
        if (item?.id === id) props.onFill?.(item)
      }}
    />
  )
}
