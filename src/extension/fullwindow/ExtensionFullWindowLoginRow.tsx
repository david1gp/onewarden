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
        "w-full rounded-lg px-3 py-2 text-left",
        "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:hover:bg-slate-800 dark:focus-visible:ring-offset-slate-950",
        p.selected &&
          "bg-blue-100 text-blue-950 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900",
      )}
    >
      <span class="block truncate text-sm font-semibold">{p.login.name}</span>
      <span class="block truncate text-xs text-slate-600 dark:text-slate-300">{p.login.username ?? "No username"}</span>
    </button>
  )
}
