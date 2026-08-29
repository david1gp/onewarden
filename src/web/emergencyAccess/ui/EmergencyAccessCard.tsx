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
import { type EmergencyAccessCardProps, emergencyAccessCardStateCreate } from "./emergencyAccessCardStateCreate.js"

export function EmergencyAccessCard(props: EmergencyAccessCardProps): JSX.Element {
  const state = emergencyAccessCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
            <Icon path={vaultSvgIcons.lifebuoy} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Emergency Access</h2>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Manage trusted contacts who can request access to your vault
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs"
            onClick={state.loadData}
            disabled={state.isLoading()}
          >
            <Icon path={vaultSvgIcons.refresh} class="mr-1 size-3.5" />
            Refresh
          </Button>
          <Button type="button" variant="filled" size="sm" class="text-xs" onClick={state.openInvite}>
            <Icon path={vaultSvgIcons.userPlus} class="mr-1 size-3.5" />
            Invite Contact
          </Button>
        </div>
      </div>

      <div class="mt-6 space-y-6">
        <div>
          <h3 class="font-semibold text-xs text-slate-800 uppercase tracking-wider dark:text-slate-200">
            Trusted Contacts ({state.trustedContacts().length})
          </h3>
          <Show
            when={state.trustedContacts().length > 0}
            fallback={
              <div class="py-4 text-xs text-slate-600 dark:text-slate-400">
                No trusted emergency contacts configured yet.
              </div>
            }
          >
            <div class="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              <For each={state.trustedContacts()}>
                {(contact) => (
                  <div class="flex items-center justify-between py-3 text-xs">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-slate-900 dark:text-slate-100">
                          {contact.name || contact.email}
                        </span>
                        <Badge variant="subtle" class="text-[10px]">
                          {contact.status === 0
                            ? "Invited"
                            : contact.status === 1
                              ? "Accepted"
                              : contact.status === 2
                                ? "Confirmed"
                                : contact.status === 3
                                  ? "Recovery Initiated"
                                  : "Recovery Approved"}
                        </Badge>
                      </div>
                      <p class="text-[11px] text-slate-600 dark:text-slate-400">
                        {contact.email} • {contact.type === 0 ? "View" : "Takeover"} • {contact.waitTimeDays} days wait
                      </p>
                    </div>

                    <div class="flex items-center gap-2">
                      <Show when={contact.status === 1}>
                        <Button
                          type="button"
                          variant="filled"
                          size="sm"
                          class="text-xs"
                          onClick={() => state.handleConfirmContact(contact)}
                        >
                          Confirm
                        </Button>
                      </Show>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="text-xs"
                        onClick={() => state.openEdit(contact)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="text-xs text-red-600 dark:text-red-400"
                        onClick={() => state.handleDeleteContact(contact)}
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

        <div class="border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 class="font-semibold text-xs text-slate-800 uppercase tracking-wider dark:text-slate-200">
            Vaults Granted to Me ({state.grantedVaults().length})
          </h3>
          <Show
            when={state.grantedVaults().length > 0}
            fallback={
              <div class="py-4 text-xs text-slate-600 dark:text-slate-400">
                No vaults have been granted to you for emergency access.
              </div>
            }
          >
            <div class="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              <For each={state.grantedVaults()}>
                {(vault) => (
                  <div class="flex items-center justify-between py-3 text-xs">
                    <div>
                      <span class="font-medium text-slate-900 dark:text-slate-100">{vault.email}</span>
                      <p class="text-[11px] text-slate-600 dark:text-slate-400">
                        {vault.type === 0 ? "View Access" : "Takeover Access"} • Wait: {vault.waitTimeDays} days
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <Show when={vault.status === 0}>
                        <Button
                          type="button"
                          variant="filled"
                          size="sm"
                          class="text-xs"
                          onClick={() => state.handleAcceptInvite(vault)}
                        >
                          Accept
                        </Button>
                      </Show>
                      <Show when={vault.status === 2}>
                        <Button
                          type="button"
                          variant="filled"
                          size="sm"
                          class="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => state.handleInitiateAccess(vault)}
                        >
                          Initiate Access
                        </Button>
                      </Show>
                      <Show when={vault.status === 4 && vault.type === 0}>
                        <Button
                          type="button"
                          variant="filled"
                          size="sm"
                          class="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => state.openVaultView(vault)}
                        >
                          View Items
                        </Button>
                      </Show>
                      <Show when={vault.status === 4 && vault.type === 1}>
                        <Button
                          type="button"
                          variant="filled"
                          size="sm"
                          class="text-xs bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => state.openTakeover(vault)}
                        >
                          Take Over
                        </Button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* Dialogs */}
      <EmergencyAccessInviteDialog
        session={props.session}
        isOpen={state.isInviteOpen}
        onClose={state.closeInvite}
        onInvited={state.loadData}
        onNotifySuccess={props.onNotifySuccess}
        onNotifyError={props.onNotifyError}
      />

      <EmergencyAccessEditDialog
        session={props.session}
        contact={state.selectedContactForEdit}
        isOpen={state.isEditOpen}
        onClose={state.closeEdit}
        onUpdated={state.loadData}
        onNotifySuccess={props.onNotifySuccess}
        onNotifyError={props.onNotifyError}
      />

      <EmergencyAccessVaultViewDialog
        session={props.session}
        contact={state.selectedContactForVaultView}
        isOpen={state.isVaultViewOpen}
        onClose={state.closeVaultView}
        onNotifyError={props.onNotifyError}
      />

      <EmergencyAccessTakeoverDialog
        session={props.session}
        contact={state.selectedContactForTakeover}
        isOpen={state.isTakeoverOpen}
        onClose={state.closeTakeover}
        onTakeoverComplete={state.loadData}
        onNotifySuccess={props.onNotifySuccess}
        onNotifyError={props.onNotifyError}
      />
    </CardWrapper>
  )
}
