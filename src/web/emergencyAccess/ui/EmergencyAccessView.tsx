import { For, type JSX, Show } from "solid-js"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { EmergencyAccessEditDialog } from "./EmergencyAccessEditDialog.jsx"
import { EmergencyAccessInviteDialog } from "./EmergencyAccessInviteDialog.jsx"
import { EmergencyAccessTakeoverDialog } from "./EmergencyAccessTakeoverDialog.jsx"
import { EmergencyAccessVaultViewDialog } from "./EmergencyAccessVaultViewDialog.jsx"
import {
  type EmergencyAccessViewProps,
  type EmergencyTab,
  emergencyAccessViewStateCreate,
} from "./emergencyAccessViewStateCreate.js"

export function EmergencyAccessView(props: EmergencyAccessViewProps): JSX.Element {
  const state = emergencyAccessViewStateCreate(props)

  const tabs: Array<{ id: EmergencyTab; label: string; count: () => number }> = [
    { id: "trusted", label: "My Emergency Contacts", count: () => state.trustedContacts().length },
    { id: "granted", label: "Vaults Granted to Me", count: () => state.grantedVaults().length },
  ]

  return (
    <div class="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">Emergency Access</h1>
          <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Designate trusted emergency contacts to access your vault or take over your account in case of emergency
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Show when={props.onNavigateToVault}>
            <Button type="button" variant="outline" size="sm" class="text-xs" onClick={state.handleBackToVault}>
              <Icon path={vaultSvgIcons.arrowLeft} class="mr-1.5 size-3.5" />
              Back to Vault
            </Button>
          </Show>
          <Button type="button" variant="filled" size="sm" class="text-xs" onClick={state.openInvite}>
            <Icon path={vaultSvgIcons.userPlus} class="mr-1.5 size-3.5" />
            Invite Contact
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

      {/* Main card */}
      <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Navigation Tabs */}
        <div class="flex border-b border-slate-200 dark:border-slate-800">
          <For each={tabs}>
            {(tab) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => state.setCurrentTab(tab.id)}
                class={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                  state.currentTab() === tab.id
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
                <span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-800">{tab.count()}</span>
              </Button>
            )}
          </For>
        </div>

        {/* Tab 1: Trusted Contacts (Grantor) */}
        <Show when={state.currentTab() === "trusted"}>
          <div class="mt-6">
            <Show
              when={state.trustedContacts().length > 0}
              fallback={
                <div class="py-12 text-center text-xs text-slate-600 dark:text-slate-400">
                  {state.isLoading()
                    ? "Loading emergency contacts..."
                    : "You haven't designated any emergency contacts yet. Click 'Invite Contact' to add one."}
                </div>
              }
            >
              <div class="divide-y divide-slate-100 dark:divide-slate-800/80">
                <For each={state.trustedContacts()}>
                  {(contact) => (
                    <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div class="flex items-start gap-3">
                        <div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                          <Icon path={vaultSvgIcons.lifebuoy} class="size-4" />
                        </div>
                        <div class="min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {contact.name || contact.email}
                            </span>
                            <Badge variant="subtle" class={`text-[10px] ${state.statusBadgeClass(contact.status)}`}>
                              {state.statusLabel(contact.status)}
                            </Badge>
                            <Badge
                              variant="subtle"
                              class="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px]"
                            >
                              {contact.type === 0 ? "View" : "Takeover"}
                            </Badge>
                          </div>
                          <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                            <span>Email: {contact.email}</span>
                            <span>•</span>
                            <span>Wait time: {contact.waitTimeDays} days</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div class="flex items-center gap-2 self-end sm:self-center">
                        <Show when={contact.status === 0}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            class="text-xs"
                            onClick={() => state.handleReinviteContact(contact)}
                            disabled={state.isActionRunning() && state.actionTargetId() === contact.id}
                          >
                            Resend Invite
                          </Button>
                        </Show>

                        <Show when={contact.status === 1}>
                          <Button
                            type="button"
                            variant="filled"
                            size="sm"
                            class="text-xs"
                            onClick={() => state.handleConfirmContact(contact)}
                            disabled={state.isActionRunning() && state.actionTargetId() === contact.id}
                          >
                            Confirm Contact
                          </Button>
                        </Show>

                        <Show when={contact.status === 3}>
                          <Button
                            type="button"
                            variant="filled"
                            size="sm"
                            class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => state.handleApproveRecovery(contact)}
                            disabled={state.isActionRunning() && state.actionTargetId() === contact.id}
                          >
                            Approve Access
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            class="text-xs text-red-600 dark:text-red-400"
                            onClick={() => state.handleRejectRecovery(contact)}
                            disabled={state.isActionRunning() && state.actionTargetId() === contact.id}
                          >
                            Reject
                          </Button>
                        </Show>

                        <Show when={contact.status === 4}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            class="text-xs text-red-600 dark:text-red-400"
                            onClick={() => state.handleRejectRecovery(contact)}
                            disabled={state.isActionRunning() && state.actionTargetId() === contact.id}
                          >
                            Revoke Access
                          </Button>
                        </Show>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="text-xs"
                          onClick={() => state.handleOpenEdit(contact)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          onClick={() => state.handleDeleteContact(contact)}
                          disabled={state.isActionRunning() && state.actionTargetId() === contact.id}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        {/* Tab 2: Granted Vaults (Grantee) */}
        <Show when={state.currentTab() === "granted"}>
          <div class="mt-6">
            <Show
              when={state.grantedVaults().length > 0}
              fallback={
                <div class="py-12 text-center text-xs text-slate-600 dark:text-slate-400">
                  {state.isLoading()
                    ? "Loading granted emergency accesses..."
                    : "No one has designated you as an emergency contact yet."}
                </div>
              }
            >
              <div class="divide-y divide-slate-100 dark:divide-slate-800/80">
                <For each={state.grantedVaults()}>
                  {(vault) => (
                    <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div class="flex items-start gap-3">
                        <div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                          <Icon path={vaultSvgIcons.personalVault} class="size-4" />
                        </div>
                        <div class="min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {vault.name || vault.email}
                            </span>
                            <Badge variant="subtle" class={`text-[10px] ${state.statusBadgeClass(vault.status)}`}>
                              {state.statusLabel(vault.status)}
                            </Badge>
                            <Badge
                              variant="subtle"
                              class="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px]"
                            >
                              {vault.type === 0 ? "View Access" : "Takeover Access"}
                            </Badge>
                          </div>
                          <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                            <span>Grantor Email: {vault.email}</span>
                            <span>•</span>
                            <span>Wait time: {vault.waitTimeDays} days</span>
                          </div>
                        </div>
                      </div>

                      {/* Grantee Actions */}
                      <div class="flex items-center gap-2 self-end sm:self-center">
                        <Show when={vault.status === 0}>
                          <Button
                            type="button"
                            variant="filled"
                            size="sm"
                            class="text-xs"
                            onClick={() => state.handleAcceptInvite(vault)}
                            disabled={state.isActionRunning() && state.actionTargetId() === vault.id}
                          >
                            Accept Invitation
                          </Button>
                        </Show>

                        <Show when={vault.status === 2}>
                          <Button
                            type="button"
                            variant="filled"
                            size="sm"
                            class="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => state.handleInitiateAccess(vault)}
                            disabled={state.isActionRunning() && state.actionTargetId() === vault.id}
                          >
                            Initiate Access Recovery
                          </Button>
                        </Show>

                        <Show when={vault.status === 4 && vault.type === 0}>
                          <Button
                            type="button"
                            variant="filled"
                            size="sm"
                            class="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => state.handleOpenVaultView(vault)}
                          >
                            View Vault Items
                          </Button>
                        </Show>

                        <Show when={vault.status === 4 && vault.type === 1}>
                          <Button
                            type="button"
                            variant="filled"
                            size="sm"
                            class="text-xs bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => state.handleOpenTakeover(vault)}
                          >
                            Take Over Account
                          </Button>
                        </Show>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          onClick={() => state.handleDeleteContact(vault)}
                          disabled={state.isActionRunning() && state.actionTargetId() === vault.id}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </CardWrapper>

      {/* Dialogs */}
      <EmergencyAccessInviteDialog
        session={props.session}
        isOpen={state.isInviteOpen}
        onClose={state.closeInvite}
        onInvited={state.loadData}
        onNotifySuccess={state.notifySuccess}
        onNotifyError={state.notifyError}
      />

      <EmergencyAccessEditDialog
        session={props.session}
        contact={state.selectedContactForEdit}
        isOpen={state.isEditOpen}
        onClose={state.closeEdit}
        onUpdated={state.loadData}
        onNotifySuccess={state.notifySuccess}
        onNotifyError={state.notifyError}
      />

      <EmergencyAccessVaultViewDialog
        session={props.session}
        contact={state.selectedContactForVaultView}
        isOpen={state.isVaultViewOpen}
        onClose={state.closeVaultView}
        onNotifyError={state.notifyError}
      />

      <EmergencyAccessTakeoverDialog
        session={props.session}
        contact={state.selectedContactForTakeover}
        isOpen={state.isTakeoverOpen}
        onClose={state.closeTakeover}
        onTakeoverComplete={state.loadData}
        onNotifySuccess={state.notifySuccess}
        onNotifyError={state.notifyError}
      />
    </div>
  )
}
