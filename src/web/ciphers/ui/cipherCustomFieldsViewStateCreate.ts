import { createEffect, onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherCustomField } from "../schemas/cipherCustomFieldSchema.js"

export interface CipherCustomFieldsViewStateProps {
  fields: () => readonly CipherCustomField[]
  itemId?: () => string | null
}

export function cipherCustomFieldsViewStateCreate(props: CipherCustomFieldsViewStateProps) {
  const revealedConcealedFields = createSignalObject<Record<number, boolean>>({})
  const copiedFieldIndex = createSignalObject<number | null>(null)

  let copyTimer: ReturnType<typeof setTimeout> | null = null

  const resetTransientState = () => {
    revealedConcealedFields.set({})
    copiedFieldIndex.set(null)
    if (copyTimer) {
      clearTimeout(copyTimer)
      copyTimer = null
    }
  }

  let previousItemId = props.itemId?.() ?? null
  createEffect(() => {
    const itemId = props.itemId?.() ?? null
    if (itemId === previousItemId) return
    previousItemId = itemId
    resetTransientState()
  })

  onCleanup(() => {
    if (copyTimer) clearTimeout(copyTimer)
  })

  const toggleConcealedField = (index: number) => {
    const curr = { ...revealedConcealedFields.get() }
    curr[index] = !curr[index]
    revealedConcealedFields.set(curr)
  }

  const isFieldRevealed = (index: number): boolean => {
    return !!revealedConcealedFields.get()[index]
  }

  const copyField = (index: number, value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {})
    }
    copiedFieldIndex.set(index)
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copiedFieldIndex.set(null)
      copyTimer = null
    }, 2000)
  }

  return {
    fields: props.fields,
    copiedFieldIndex: copiedFieldIndex.get,
    isFieldRevealed,
    toggleConcealedField,
    copyField,
  }
}
