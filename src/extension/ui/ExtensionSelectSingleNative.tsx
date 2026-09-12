import type { ComponentProps } from "solid-js"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

/** Extension-themed native single-value select. */
export function ExtensionSelectSingleNative(p: ComponentProps<typeof SelectSingleNative>) {
  return <SelectSingleNative {...p} class={classMerge("extension-select-control", p.class)} />
}
