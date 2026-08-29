import { For, type JSX, Show } from "solid-js"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type CipherPasswordHistoryListStateProps,
  cipherPasswordHistoryListStateCreate,
} from "./cipherPasswordHistoryListStateCreate.js"

export function CipherPasswordHistoryList(props: CipherPasswordHistoryListStateProps): JSX.Element {
  const state = cipherPasswordHistoryListStateCreate(props)

  return (
    <div class="space-y-3">
      <Show
        when={state.entries().length > 0}
        fallback={
          <div class="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
            No previous passwords recorded for this cipher item.
          </div>
        }
      >
        <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          <For each={state.entries()}>
            {(entry, index) => (
              <li class="flex items-center justify-between gap-3 p-3 text-xs">
                <div class="min-w-0 flex-1">
                  <p class="truncate font-mono text-sm tracking-wider text-slate-900 select-all dark:text-slate-100">
                    {state.isRevealed(index()) ? entry.password : "••••••••••••••••••••"}
                  </p>
                  <p class="mt-0.5 text-[11px] text-slate-400">Last used: {state.formatDate(entry.lastUsedDate)}</p>
                </div>
                <div class="flex shrink-0 items-center gap-1.5">
                  <ButtonIcon
                    variant="ghost"
                    size="sm"
                    class="text-xs"
                    icon={state.isRevealed(index()) ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                    iconClass="size-3.5 text-slate-500 dark:text-slate-400"
                    onClick={() => state.toggleReveal(index())}
                    aria-label={state.isRevealed(index()) ? "Hide password" : "Show password"}
                  >
                    {state.isRevealed(index()) ? "Hide" : "Show"}
                  </ButtonIcon>
                  <ButtonIcon
                    variant="subtle"
                    size="sm"
                    class="text-xs"
                    icon={state.isCopied(index()) ? vaultSvgIcons.check : vaultSvgIcons.copy}
                    iconClass={`size-3.5 ${state.isCopied(index()) ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}
                    onClick={() => state.copyPassword(index(), entry.password)}
                    aria-label={state.isCopied(index()) ? "Copied past password" : "Copy past password"}
                  >
                    {state.isCopied(index()) ? "Copied" : "Copy"}
                  </ButtonIcon>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
