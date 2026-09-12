import type { ComponentProps } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

/** Extension-themed signal-bound text input. */
export function ExtensionInputS(p: ComponentProps<typeof InputS>) {
  return <InputS {...p} class={classMerge("extension-input-control", p.class)} />
}
