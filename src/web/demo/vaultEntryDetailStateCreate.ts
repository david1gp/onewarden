import { createMemo } from "solid-js"
import { cipherItemFromDemo } from "../ciphers/model/cipherItemFromDemo.js"
import type { CipherItem } from "../ciphers/schemas/cipherItemSchema.js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultEntryDetailStateProps {
  item: () => VaultItem | null
  onToggleFavorite?: (id: string) => void
  onEdit?: (id: string) => void
}

export function vaultEntryDetailStateCreate(props: VaultEntryDetailStateProps) {
  const cipherItem = createMemo<CipherItem | null>(() => {
    const raw = props.item()
    if (!raw) return null
    return cipherItemFromDemo(raw)
  })

  return {
    cipherItem,
    toggleFavorite: () => {
      const it = props.item()
      if (it && props.onToggleFavorite) props.onToggleFavorite(it.id)
    },
    editItem: () => {
      const it = props.item()
      if (it && props.onEdit) props.onEdit(it.id)
    },
  }
}
