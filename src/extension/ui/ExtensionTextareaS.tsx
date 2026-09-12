import type { ComponentProps } from "solid-js"
import { TextareaS } from "#ui/input/textarea/TextareaS.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

/** Extension-themed signal-bound textarea. */
export function ExtensionTextareaS(p: ComponentProps<typeof TextareaS>) {
  return <TextareaS {...p} class={classMerge("extension-textarea-control", p.class)} />
}
