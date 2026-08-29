import { onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherCustomField } from "../schemas/cipherCustomFieldSchema.js"

export interface CipherCustomFieldsViewStateProps {
  fields: () => readonly CipherCustomField[]
}

export function cipherCustomFieldsViewStateCreate(props: CipherCustomFieldsViewStateProps) {
  const revealedConcealedFields = createSignalObject<Record<number, boolean>>({})
  const copiedFieldIndex = createSignalObject<number | null>(null)

  let copyTimer: ReturnType<typeof setTimeout> | null = null

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
