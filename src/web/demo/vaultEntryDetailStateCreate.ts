import { createMemo, onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { VaultItem } from "./vaultItemSchema.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

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

  const getCategoryIcon = (category: string | undefined): string => {
    if (!category) return vaultSvgIcons.login
    const map: Record<string, string> = {
      login: vaultSvgIcons.login,
      secureNote: vaultSvgIcons.secureNote,
      creditCard: vaultSvgIcons.creditCard,
      identity: vaultSvgIcons.identity,
      password: vaultSvgIcons.password,
      server: vaultSvgIcons.server,
      sshKey: vaultSvgIcons.sshKey,
    }
    return map[category] ?? vaultSvgIcons.login
  }

  const getCategoryLabel = (category: string | undefined): string => {
    if (!category) return "Item"
    const map: Record<string, string> = {
      login: "Login",
      secureNote: "Secure Note",
      creditCard: "Credit Card",
      identity: "Identity",
      password: "Password",
      server: "Server",
      sshKey: "SSH Key",
    }
    return map[category] ?? "Item"
  }

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
    switch (cat) {
      case "login":
        return { bg: "bg-blue-100 dark:bg-blue-950/60", text: "text-blue-600 dark:text-blue-400" }
      case "secureNote":
        return { bg: "bg-amber-100 dark:bg-amber-950/60", text: "text-amber-600 dark:text-amber-400" }
      case "creditCard":
        return { bg: "bg-emerald-100 dark:bg-emerald-950/60", text: "text-emerald-600 dark:text-emerald-400" }
      case "identity":
        return { bg: "bg-purple-100 dark:bg-purple-950/60", text: "text-purple-600 dark:text-purple-400" }
      case "server":
        return { bg: "bg-slate-200 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300" }
      case "sshKey":
        return { bg: "bg-teal-100 dark:bg-teal-950/60", text: "text-teal-600 dark:text-teal-400" }
      default:
        return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300" }
    }
  })

  return {
    item: props.item,
    isPasswordRevealed: isPasswordRevealed.get,
    copiedField: copiedField.get,
    categoryTheme,
    getCategoryIcon,
    getCategoryLabel,
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
