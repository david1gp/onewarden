import { Badge } from "#ui/static/badge/Badge.jsx"
import { adminStatusBadgeStateCreate } from "./adminStatusBadgeStateCreate.js"

export function AdminStatusBadge(p: { status: string }) {
  const state = adminStatusBadgeStateCreate(() => p.status)

  return (
    <Badge variant={state.variant()} class={state.class()}>
      {state.label()}
    </Badge>
  )
}
