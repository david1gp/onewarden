import type { ComponentProps } from "solid-js"
import { SeparatorWithText } from "#ui/static/separator/SeparatorWithText.jsx"

/** Text separator using the extension semantic boundary color. */
export function ExtensionSeparatorWithText(p: ComponentProps<typeof SeparatorWithText>) {
  return (
    <div class="extension-separator-with-text">
      <SeparatorWithText {...p} />
    </div>
  )
}
