import type { ComponentProps } from "solid-js"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

/** Extension-themed icon button with explicit focus and unavailable states. */
export function ExtensionButtonIcon(p: ComponentProps<typeof ButtonIcon>) {
  return (
    <ButtonIcon
      {...p}
      class={classMerge("extension-icon-control", p.class)}
      disabled={p.disabled || p.isLoading || !!p.validationMessage}
    />
  )
}
