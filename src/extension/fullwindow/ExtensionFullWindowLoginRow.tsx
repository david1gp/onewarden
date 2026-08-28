import { classArr } from "#ui/utils/classArr.js"
import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"

export interface ExtensionFullWindowLoginRowProps {
  login: ExtensionFullWindowLogin
  selected: boolean
  onSelect: (login: ExtensionFullWindowLogin) => void
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
        "w-full rounded-lg px-3 py-2 text-left",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        p.selected && "bg-gray-100 dark:bg-gray-700",
      )}
    >
      <span class="block truncate text-sm font-semibold">{p.login.name}</span>
      <span class="block truncate text-xs text-gray-600 dark:text-gray-300">{p.login.username ?? "No username"}</span>
    </button>
  )
}
