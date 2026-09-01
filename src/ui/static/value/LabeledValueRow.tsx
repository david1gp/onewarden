import { type JSX, Show } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"

export interface LabeledValueRowProps {
  /** Caller-supplied label content. */
  label: JSX.Element
  /** Caller-supplied value content; masking, links, and badges stay in the caller. */
  value: JSX.Element
  /** Optional trailing action content; omitted entirely when absent. */
  action?: JSX.Element
  class?: string
  labelClass?: string
  valueClass?: string
  actionClass?: string
}

const rowLayoutClass = "flex items-center justify-between"
const valueContentLayoutClass = "min-w-0 flex-1"
const actionLayoutClass = "flex shrink-0 items-center"

/** Label/value row with an optional trailing action, all content supplied by the caller. */
export function LabeledValueRow(p: LabeledValueRowProps) {
  return (
    <div class={classMerge(rowLayoutClass, p.class)}>
      <div class={valueContentLayoutClass}>
        <div class={p.labelClass}>{p.label}</div>
        <div class={p.valueClass}>{p.value}</div>
      </div>
      <Show when={p.action !== undefined}>
        <div class={classMerge(actionLayoutClass, p.actionClass)}>{p.action}</div>
      </Show>
    </div>
  )
}
