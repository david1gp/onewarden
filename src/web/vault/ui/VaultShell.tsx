import { type JSX, Show } from "solid-js"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { VaultWorkspace } from "../../demo/VaultWorkspace.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { VaultEmptyState } from "./VaultEmptyState.jsx"
import { type VaultShellProps, vaultShellStateCreate } from "./vaultShellStateCreate.js"

export function VaultShell(props: VaultShellProps = {}): JSX.Element {
  const state = vaultShellStateCreate(props)

  return (
    <div class="flex h-dvh w-full flex-col overflow-hidden bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Top Application Header / Banner */}
      <header class="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 text-xs dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-2.5">
          <div class="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Icon path={vaultSvgIcons.shieldCheck} class="size-4" />
          </div>
          <h1 class="font-bold text-sm text-slate-900 tracking-tight dark:text-slate-50">OneWarden</h1>
          <Badge variant="subtle" class="hidden sm:inline-flex px-1.5 py-0 text-[10px]">
            Vault
          </Badge>
        </div>

        <div class="flex items-center gap-2">
          <Show when={state.errorMessage()}>
            <span class="truncate text-[11px] text-rose-700 font-medium dark:text-rose-400">
              {state.errorMessage()}
            </span>
          </Show>
          <ButtonIcon
            variant="ghost"
            size="sm"
            icon={vaultSvgIcons.clock}
            iconClass="size-3.5 mr-1 text-slate-600 dark:text-slate-400"
            onClick={() => void state.syncVault()}
            disabled={state.isLoading()}
            class="text-xs text-slate-600 dark:text-slate-300"
          >
            {state.isLoading() ? "Syncing..." : "Sync"}
          </ButtonIcon>
        </div>
      </header>

      {/* Main Vault Workspace Area */}
      <main id="main-content" class="flex flex-1 min-h-0 overflow-hidden">
        <Show
          when={state.items().length > 0 || state.isLoading()}
          fallback={<VaultEmptyState onAction={() => void state.syncVault()} actionLabel="Sync Now" />}
        >
          <VaultWorkspace
            initialItems={state.items()}
            folders={state.folders}
            collections={state.collections}
            profile={state.profile}
            enableUrlSync={state.enableUrlSync}
            enableKeyboardWorkflows={true}
          />
        </Show>
      </main>

      {/* Application Footer */}
      <footer class="flex h-6 shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 text-[10px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
        <span>OneWarden</span>
        <span class="flex items-center gap-1">
          <span class="size-1.5 rounded-full bg-emerald-500" />
          End-to-End Encrypted
        </span>
      </footer>
    </div>
  )
}
