import { For, type JSX, Match, Show, Switch } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { AdminBackupCard } from "./AdminBackupCard.jsx"
import { AdminConfigCard } from "./AdminConfigCard.jsx"
import { AdminDiagnosticsCard } from "./AdminDiagnosticsCard.jsx"
import { AdminMailTestCard } from "./AdminMailTestCard.jsx"
import { AdminOrganizationsCard } from "./AdminOrganizationsCard.jsx"
import { AdminUsersCard } from "./AdminUsersCard.jsx"
import {
  type AdminDashboardTab,
  type AdminDashboardViewProps,
  adminDashboardViewStateCreate,
} from "./adminDashboardViewStateCreate.js"

export function AdminDashboardView(props: AdminDashboardViewProps): JSX.Element {
  const state = adminDashboardViewStateCreate(props)

  const tabs: Array<{ id: AdminDashboardTab; label: string; icon: string }> = [
    { id: "users", label: "Users", icon: vaultSvgIcons.users },
    { id: "organizations", label: "Organizations", icon: vaultSvgIcons.workVault },
    { id: "diagnostics", label: "Diagnostics", icon: vaultSvgIcons.shieldCheck },
    { id: "config", label: "Configuration", icon: vaultSvgIcons.cog },
    { id: "tools", label: "Mail & Backup", icon: vaultSvgIcons.server },
  ]

  return (
    <div class="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            <Icon path={vaultSvgIcons.cog} class="size-5" />
          </div>
          <div>
            <h1 class="font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">OneWarden Admin Panel</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              System administration, user oversight, and server diagnostics
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <Show when={props.onNavigateHome}>
            <Button type="button" variant="outline" size="sm" class="text-xs" onClick={state.handleNavigateHome}>
              <Icon path={vaultSvgIcons.personalVault} class="mr-1.5 size-3.5" />
              Vault
            </Button>
          </Show>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs text-red-600 dark:text-red-400"
            onClick={state.handleLogout}
            disabled={state.isLoggingOut()}
          >
            {state.isLoggingOut() ? "Logging out..." : "Log Out Admin"}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <Show when={state.errorMessage()}>
        {(msg) => (
          <div
            role="alert"
            class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {msg()}
          </div>
        )}
      </Show>

      <Show when={state.successMessage()}>
        {(msg) => (
          <div
            role="status"
            class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {msg()}
          </div>
        )}
      </Show>

      {/* Tabs */}
      <div class="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        <For each={tabs}>
          {(tab) => (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => state.setCurrentTab(tab.id)}
              class={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                state.currentTab() === tab.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <Icon path={tab.icon} class="size-3.5" />
              <span>{tab.label}</span>
            </Button>
          )}
        </For>
      </div>

      {/* Content */}
      <Switch>
        <Match when={state.currentTab() === "users"}>
          <AdminUsersCard
            apiClient={props.apiClient}
            onNotifySuccess={state.notifySuccess}
            onNotifyError={state.notifyError}
          />
        </Match>
        <Match when={state.currentTab() === "organizations"}>
          <AdminOrganizationsCard
            apiClient={props.apiClient}
            onNotifySuccess={state.notifySuccess}
            onNotifyError={state.notifyError}
          />
        </Match>
        <Match when={state.currentTab() === "diagnostics"}>
          <AdminDiagnosticsCard apiClient={props.apiClient} onNotifyError={state.notifyError} />
        </Match>
        <Match when={state.currentTab() === "config"}>
          <AdminConfigCard
            apiClient={props.apiClient}
            onNotifySuccess={state.notifySuccess}
            onNotifyError={state.notifyError}
          />
        </Match>
        <Match when={state.currentTab() === "tools"}>
          <div class="space-y-6">
            <AdminMailTestCard
              apiClient={props.apiClient}
              onNotifySuccess={state.notifySuccess}
              onNotifyError={state.notifyError}
            />
            <AdminBackupCard
              apiClient={props.apiClient}
              onNotifySuccess={state.notifySuccess}
              onNotifyError={state.notifyError}
            />
          </div>
        </Match>
      </Switch>
    </div>
  )
}
