import { type JSX, Match, Show, Switch } from "solid-js"
import { EmergencyAccessCard } from "../../emergencyAccess/ui/EmergencyAccessCard.jsx"
import { AccountDangerZoneCard } from "./AccountDangerZoneCard.jsx"
import { AccountDevicesCard } from "./AccountDevicesCard.jsx"
import { AccountEmailChangeCard } from "./AccountEmailChangeCard.jsx"
import { AccountProfileCard } from "./AccountProfileCard.jsx"
import { AccountSecurityCard } from "./AccountSecurityCard.jsx"
import { SettingsNav } from "./SettingsNav.jsx"
import { type SettingsViewProps, settingsViewStateCreate } from "./settingsViewStateCreate.js"
import { VaultImportExportCard } from "./VaultImportExportCard.jsx"

export function SettingsView(props: SettingsViewProps): JSX.Element {
  const state = settingsViewStateCreate(props)

  return (
    <div class="mx-auto max-w-5xl px-4 py-8">
      <div class="mb-6">
        <h1 class="font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">
          Account &amp; Security Settings
        </h1>
        <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Manage your personal profile, cryptographic keys, sessions, and vault backups
        </p>
      </div>

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

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="md:col-span-1">
          <SettingsNav
            currentTab={state.currentTab}
            onSelectTab={state.setTab}
            onBackToVault={state.handleBackToVault}
            onNavigateToTwoFactor={state.handleNavigateToTwoFactor}
          />
        </div>

        <div class="md:col-span-3">
          <Switch>
            <Match when={state.currentTab() === "profile"}>
              <AccountProfileCard
                session={props.session}
                onNotifySuccess={state.notifySuccess}
                onNotifyError={state.notifyError}
              />
            </Match>
            <Match when={state.currentTab() === "security"}>
              <AccountSecurityCard
                session={props.session}
                onNotifySuccess={state.notifySuccess}
                onNotifyError={state.notifyError}
              />
            </Match>
            <Match when={state.currentTab() === "email"}>
              <AccountEmailChangeCard
                session={props.session}
                onNotifySuccess={state.notifySuccess}
                onNotifyError={state.notifyError}
              />
            </Match>
            <Match when={state.currentTab() === "devices"}>
              <AccountDevicesCard
                session={props.session}
                onNotifySuccess={state.notifySuccess}
                onNotifyError={state.notifyError}
              />
            </Match>
            <Match when={state.currentTab() === "emergency"}>
              <EmergencyAccessCard
                session={props.session}
                onNotifySuccess={state.notifySuccess}
                onNotifyError={state.notifyError}
              />
            </Match>
            <Match when={state.currentTab() === "tools"}>
              <VaultImportExportCard
                session={props.session}
                onNotifySuccess={state.notifySuccess}
                onNotifyError={state.notifyError}
              />
            </Match>
            <Match when={state.currentTab() === "danger"}>
              <AccountDangerZoneCard
                session={props.session}
                onNotifySuccess={state.notifySuccess}
                onNotifyError={state.notifyError}
                onAccountDeleted={state.handleAccountDeleted}
              />
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  )
}
