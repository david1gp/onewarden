import type { JSX } from "solid-js"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { type CipherTypeBadgeStateProps, cipherTypeBadgeStateCreate } from "./cipherTypeBadgeStateCreate.js"

export function CipherTypeBadge(props: CipherTypeBadgeStateProps): JSX.Element {
  const state = cipherTypeBadgeStateCreate(props)

  return (
    <Badge variant={state.theme().badgeVariant} class="inline-flex items-center gap-1.5 text-sm">
      <Icon path={state.icon()} class="size-3.5" />
      <span>{state.label()}</span>
    </Badge>
  )
}
