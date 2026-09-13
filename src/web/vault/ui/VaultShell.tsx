import { type JSX, Show } from "solid-js"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { VaultEmptyState } from "./VaultEmptyState.jsx"
import { VaultWorkspace } from "./VaultWorkspace.jsx"
import type { VaultShellViewProps } from "./vaultShellViewProps.js"

export function VaultShell(props: VaultShellViewProps): JSX.Element {
  const { actions, state } = props
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
      <header class="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex min-w-0 items-center gap-2.5">
          <div class="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Icon path={vaultSvgIcons.shieldCheck} class="size-4" />
          </div>
          <h1 class="font-bold text-sm text-slate-900 tracking-tight dark:text-slate-50">OneWarden</h1>
          <Badge variant="subtle" class="hidden sm:inline-flex px-1.5 py-0 text-sm">
            Vault
          </Badge>
        </div>

        <div class="flex max-w-full flex-wrap items-center justify-end gap-2">
          <Show when={state.errorMessage()}>
            <span class="truncate text-sm text-rose-700 font-medium dark:text-rose-400">{state.errorMessage()}</span>
          </Show>
          <Show when={actions.onOpenOrganizations}>
            <ButtonIcon
              variant="ghost"
              size="sm"
              icon={vaultSvgIcons.workVault}
              iconClass="size-3.5 mr-1 text-slate-600 dark:text-slate-400"
              onClick={() => actions.onOpenOrganizations?.()}
              class="h-8 text-sm text-slate-600 dark:text-slate-300"
            >
              Organizations
            </ButtonIcon>
          </Show>
          <Show when={actions.onOpenSends}>
            <ButtonIcon
              variant="ghost"
              size="sm"
              icon={vaultSvgIcons.send}
              iconClass="size-3.5 mr-1 text-slate-600 dark:text-slate-400"
              onClick={() => actions.onOpenSends?.()}
              class="h-8 text-sm text-slate-600 dark:text-slate-300"
            >
              Send
            </ButtonIcon>
          </Show>
          <Show when={actions.onOpenEmergencyAccess}>
            <ButtonIcon
              variant="ghost"
              size="sm"
              icon={vaultSvgIcons.lifebuoy}
              iconClass="size-3.5 mr-1 text-slate-600 dark:text-slate-400"
              onClick={() => actions.onOpenEmergencyAccess?.()}
              class="h-8 text-sm text-slate-600 dark:text-slate-300"
            >
              Emergency
            </ButtonIcon>
          </Show>
          <Show when={actions.onOpenSettings}>
            <ButtonIcon
              variant="ghost"
              size="sm"
              icon={vaultSvgIcons.server}
              iconClass="size-3.5 mr-1 text-slate-600 dark:text-slate-400"
              onClick={() => actions.onOpenSettings?.()}
              class="h-8 text-sm text-slate-600 dark:text-slate-300"
            >
              Settings
            </ButtonIcon>
          </Show>
          <Show when={actions.onLock}>
            <ButtonIcon
              variant="ghost"
              size="sm"
              icon={vaultSvgIcons.lock}
              iconClass="size-3.5 mr-1 text-slate-600 dark:text-slate-400"
              onClick={() => actions.onLock?.()}
              class="h-8 text-sm text-slate-600 dark:text-slate-300"
            >
              Lock
            </ButtonIcon>
          </Show>
          <Show when={actions.onLogout}>
            <ButtonIcon
              variant="ghost"
              size="sm"
              icon={vaultSvgIcons.login}
              iconClass="size-3.5 mr-1 text-slate-600 dark:text-slate-400"
              onClick={() => actions.onLogout?.()}
              class="h-8 text-sm text-slate-600 dark:text-slate-300"
            >
              Log Out
            </ButtonIcon>
          </Show>
          <ButtonIcon
            variant="ghost"
            size="sm"
            icon={vaultSvgIcons.clock}
            iconClass="size-3.5 mr-1 text-slate-600 dark:text-slate-400"
            onClick={() => void actions.syncVault()}
            disabled={state.isLoading()}
            class="h-8 text-sm text-slate-600 dark:text-slate-300"
          >
            {state.isLoading() ? "Syncing..." : "Sync"}
          </ButtonIcon>
        </div>
      </header>

      {/* Main Vault Workspace Area */}
      <main id="main-content" class="flex flex-1 min-h-0 overflow-hidden">
        <Show
          when={state.items().length > 0 || state.isLoading()}
          fallback={<VaultEmptyState onAction={() => void actions.syncVault()} actionLabel="Sync Now" />}
        >
          <VaultWorkspace {...props.workspace} />
        </Show>
      </main>
    </div>
  )
}
