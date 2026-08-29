import { createMemo, onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultCategoryIconResolve } from "./vaultCategoryIconResolve.js"
import { vaultCategoryLabelResolve } from "./vaultCategoryLabelResolve.js"
import { vaultCategoryThemeResolve } from "./vaultCategoryThemeResolve.js"
import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultEntryDetailStateProps {
  item: () => VaultItem | null
  onToggleFavorite?: (id: string) => void
}

export function vaultEntryDetailStateCreate(props: VaultEntryDetailStateProps) {
  const isPasswordRevealed = createSignalObject(false)
  const copiedField = createSignalObject<string | null>(null)
  const revealedConcealedFields = createSignalObject<Record<number, boolean>>({})

  let copyTimer: ReturnType<typeof setTimeout> | null = null

  onCleanup(() => {
    if (copyTimer) {
      clearTimeout(copyTimer)
    }
  })

  const copyToClipboard = (fieldName: string, value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {})
    }
    copiedField.set(fieldName)
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedField.set(null)
    }, 2000)
  }

  const togglePasswordReveal = () => {
    isPasswordRevealed.set(!isPasswordRevealed.get())
  }

  const toggleConcealedField = (index: number) => {
    const curr = { ...revealedConcealedFields.get() }
    curr[index] = !curr[index]
    revealedConcealedFields.set(curr)
  }

  const isFieldRevealed = (index: number): boolean => {
    return !!revealedConcealedFields.get()[index]
  }

  const categoryTheme = createMemo(() => {
    const cat = props.item()?.category
    return vaultCategoryThemeResolve(cat ?? "")
  })

  return {
    item: props.item,
    isPasswordRevealed: isPasswordRevealed.get,
    copiedField: copiedField.get,
    categoryTheme,
    getCategoryIcon: vaultCategoryIconResolve,
    getCategoryLabel: vaultCategoryLabelResolve,
    isFieldRevealed,
    copyToClipboard,
    togglePasswordReveal,
    toggleConcealedField,
    toggleFavorite: () => {
      const it = props.item()
      if (it && props.onToggleFavorite) props.onToggleFavorite(it.id)
    },
  }
}
