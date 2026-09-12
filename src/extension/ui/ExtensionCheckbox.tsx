import type { JSX } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

interface ExtensionCheckboxProps {
  checked: boolean
  children?: JSX.Element
  class?: string
  disabled?: boolean
  id: string
  onChange: (checked: boolean) => void
}

/** Extension checkbox backed by one visible, natively disabled input. */
export function ExtensionCheckbox(p: ExtensionCheckboxProps) {
  return (
    <Label
      for={p.id}
      class={classMerge(
        "extension-checkbox-control flex items-start gap-1",
        p.disabled && "cursor-not-allowed",
        p.class,
      )}
    >
      <input
        id={p.id}
        type="checkbox"
        class="extension-checkbox-input size-6 shrink-0 cursor-pointer"
        checked={p.checked}
        disabled={p.disabled}
        onChange={(event) => p.onChange(event.currentTarget.checked)}
      />
      <span>{p.children}</span>
    </Label>
  )
}
