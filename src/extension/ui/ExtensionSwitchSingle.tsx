import type { ComponentProps } from "solid-js"
import { SwitchSingle } from "#ui/input/switch/SwitchSingle.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

/** Extension-themed segmented single-value switch. */
export function ExtensionSwitchSingle(p: ComponentProps<typeof SwitchSingle>) {
  return <SwitchSingle {...p} class={classMerge("extension-switch-control", p.class)} />
}
