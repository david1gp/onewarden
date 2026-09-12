import type { ComponentProps } from "solid-js"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

/** Badge using the extension semantic surface and boundary colors. */
export function ExtensionBadge(p: ComponentProps<typeof Badge>) {
  return <Badge {...p} class={classMerge("extension-badge", p.class)} />
}
