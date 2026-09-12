import { classArr } from "#ui/utils/classArr.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"

export interface ExtensionFullWindowLoginRowProps {
  login: ExtensionLogin
  selected: boolean
  onSelect: (login: ExtensionLogin) => void
}

/** One selectable row in the full-window vault list pane. */
export function ExtensionFullWindowLoginRow(p: ExtensionFullWindowLoginRowProps) {
  return (
    <button
      type="button"
      aria-label={p.login.name}
      aria-current={p.selected ? "true" : undefined}
      onClick={() => p.onSelect(p.login)}
      class={classArr(
        "extension-selected-control w-full rounded-lg px-3 py-2 text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      <span class="block truncate text-sm font-semibold">{p.login.name}</span>
      <span class="extension-muted-text block truncate text-xs">{p.login.username ?? "No username"}</span>
    </button>
  )
}
