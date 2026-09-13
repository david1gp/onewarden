import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { cipherPasswordHistoryFormatDate } from "../model/cipherPasswordHistoryFormatDate.js"
import type { CipherPasswordHistoryEntry } from "../schemas/cipherPasswordHistoryEntrySchema.js"

export interface CipherPasswordHistoryListStateProps {
  entries: () => CipherPasswordHistoryEntry[]
  copyToClipboard?: (value: string) => Promise<void> | void
}

export function cipherPasswordHistoryListStateCreate(props: CipherPasswordHistoryListStateProps) {
  const revealedIndices = createSignalObject<Record<number, boolean>>({})
  const copiedIndex = createSignalObject<number | null>(null)

  const toggleReveal = (index: number) => {
    const current = { ...revealedIndices.get() }
    current[index] = !current[index]
    revealedIndices.set(current)
  }

  const isRevealed = (index: number) => {
    return !!revealedIndices.get()[index]
  }

  const copyPassword = async (index: number, password: string) => {
    await Promise.resolve(props.copyToClipboard?.(password)).catch(() => {})
    copiedIndex.set(index)
    setTimeout(() => {
      if (copiedIndex.get() === index) {
        copiedIndex.set(null)
      }
    }, 2000)
  }

  const isCopied = (index: number) => copiedIndex.get() === index

  return {
    entries: props.entries,
    isRevealed,
    toggleReveal,
    copyPassword,
    isCopied,
    formatDate: cipherPasswordHistoryFormatDate,
  }
}
