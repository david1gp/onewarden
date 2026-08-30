import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type VaultEmptyStateProps, vaultEmptyStateStateCreate } from "./vaultEmptyStateStateCreate.js"

export function VaultEmptyState(props: VaultEmptyStateProps = {}): JSX.Element {
  const state = vaultEmptyStateStateCreate(props)

  return (
    <div class="flex h-full w-full flex-col items-center justify-center p-8 text-center">
      <div class="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
        <Icon path={vaultSvgIcons.shieldCheck} class="size-8" />
      </div>
      <h2 class="mt-4 font-bold text-lg text-slate-900 tracking-tight dark:text-slate-100">{state.title()}</h2>
      <p class="mt-1 max-w-sm text-sm text-slate-600 leading-relaxed dark:text-slate-400">{state.description()}</p>
      <Show when={state.actionLabel()}>
        <Button variant="filledBlue" size="sm" class="mt-4 h-8 text-sm font-semibold" onClick={state.handleAction}>
          <Icon path={vaultSvgIcons.plus} class="mr-1.5 size-3.5" />
          {state.actionLabel()}
        </Button>
      </Show>
    </div>
  )
}
