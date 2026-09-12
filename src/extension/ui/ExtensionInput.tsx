import type { ComponentProps } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

/** Extension-themed native text input. */
export function ExtensionInput(p: ComponentProps<typeof Input>) {
  return <Input {...p} class={classMerge("extension-input-control", p.class)} />
}
