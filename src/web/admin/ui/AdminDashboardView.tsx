import { type JSX, Match, Show, Switch } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { AdminShell } from "../AdminShell.jsx"
import { AdminBackupCard } from "./AdminBackupCard.jsx"
import { AdminConfigCard } from "./AdminConfigCard.jsx"
import type { AdminDashboardViewProps } from "./AdminDashboardViewProps.js"
import { AdminDiagnosticsCard } from "./AdminDiagnosticsCard.jsx"
import { AdminMailTestCard } from "./AdminMailTestCard.jsx"
import { AdminOrganizationsCard } from "./AdminOrganizationsCard.jsx"
import { AdminUsersCard } from "./AdminUsersCard.jsx"
import { adminDashboardViewStateCreate } from "./adminDashboardViewStateCreate.js"

export function AdminDashboardView(props: AdminDashboardViewProps): JSX.Element {
  const state = adminDashboardViewStateCreate(props)

  return (
    <AdminShell
      title="OneWarden Admin Panel"
      description="System administration, user oversight, and server diagnostics"
      sections={state.sections}
      activeSection={state.currentTab}
      onSelectSection={state.setCurrentTab}
      headerActions={
        <div class="flex flex-wrap items-center gap-2">
          <Show when={props.onNavigateHome}>
            <Button type="button" variant="outline" size="sm" class="h-8 text-sm" onClick={state.handleNavigateHome}>
              <Icon path={vaultSvgIcons.personalVault} class="mr-1.5 size-3.5" />
              Vault
            </Button>
          </Show>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8 text-sm text-red-600 dark:text-red-400"
            onClick={state.handleLogout}
            disabled={state.isLoggingOut()}
          >
            <Icon path={vaultSvgIcons.lock} class="mr-1.5 size-3.5" />
            {state.isLoggingOut() ? "Logging out..." : "Log Out Admin"}
          </Button>
        </div>
      }
    >
      <Show when={state.errorMessage()}>
        {(msg) => (
          <div
            role="alert"
            class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {msg()}
          </div>
        )}
      </Show>

      <Show when={state.successMessage()}>
        {(msg) => (
          <div
            role="status"
            class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {msg()}
          </div>
        )}
      </Show>

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
    </AdminShell>
  )
}
