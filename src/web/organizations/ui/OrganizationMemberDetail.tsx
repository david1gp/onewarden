import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationMemberDetailProps,
  organizationMemberDetailStateCreate,
} from "./organizationMemberDetailStateCreate.js"

export function OrganizationMemberDetail(props: OrganizationMemberDetailProps): JSX.Element {
  const state = organizationMemberDetailStateCreate(props)

  return (
    <div class="flex h-full flex-col overflow-y-auto bg-white p-6 dark:bg-slate-900">
      <Show when={state.hasBack()}>
        <div class="mb-4 md:hidden">
          <Button variant="outline" size="sm" onClick={state.handleBackClick}>
            Back to members
          </Button>
        </div>
      </Show>
      <Show
        when={state.member()}
        fallback={
          <div class="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <svg
              class="mb-3 size-12 stroke-current stroke-1 opacity-40"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d={vaultSvgIcons.identity} fill="currentColor" />
            </svg>
            <p class="font-medium text-sm">Select a member to view details and permissions</p>
          </div>
        }
      >
        {(mem) => (
          <div class="space-y-6">
            {/* Header / Avatar */}
            <div class="flex items-start justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
              <div class="flex items-center gap-4">
                <div class="flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg dark:bg-blue-900 dark:text-blue-200">
                  {mem().name ? mem().name?.charAt(0).toUpperCase() : mem().email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 class="font-bold text-slate-900 text-lg dark:text-slate-100">{mem().name || mem().email}</h2>
                  <p class="text-slate-500 text-sm dark:text-slate-400">{mem().email}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Badge variant={state.statusInfo().variant}>{state.statusInfo().label}</Badge>
                <Badge variant="subtle">{state.roleLabel()}</Badge>
              </div>
            </div>

            {/* Quick Details Card */}
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Member ID</span>
                  <p class="font-mono text-slate-800 dark:text-slate-200 truncate">{mem().id}</p>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Two-Factor Authentication</span>
                  <div class="mt-0.5">
                    <Badge variant={mem().twoFactorEnabled ? "filledGreen" : "subtle"}>
                      {mem().twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400">External ID</span>
                  <p class="font-mono text-slate-800 dark:text-slate-200">{mem().externalId || "None"}</p>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Collection Access</span>
                  <p class="font-semibold text-slate-800 dark:text-slate-200">
                    {mem().accessAll ? "All Collections" : `${mem().collections?.length ?? 0} Specific`}
                  </p>
                </div>
              </div>
            </div>

            {/* Assigned Collections Section */}
            <div>
              <h3 class="font-semibold text-slate-900 text-sm dark:text-slate-100">Assigned Collections</h3>
              <Show
                when={!mem().accessAll}
                fallback={
                  <p class="mt-2 text-slate-500 text-xs dark:text-slate-400">
                    This user has access to all current and future collections in this organization.
                  </p>
                }
              >
                <Show
                  when={(mem().collections?.length ?? 0) > 0}
                  fallback={
                    <p class="mt-2 text-slate-500 text-xs italic dark:text-slate-400">No collections assigned yet.</p>
                  }
                >
                  <div class="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    <For each={mem().collections}>
                      {(col) => (
                        <div class="flex items-center justify-between p-3 text-xs">
                          <span class="font-medium text-slate-800 dark:text-slate-200">{col.name || col.id}</span>
                          <div class="flex items-center gap-1.5">
                            <Show when={col.readOnly}>
                              <Badge variant="subtle">Read-Only</Badge>
                            </Show>
                            <Show when={col.hidePasswords}>
                              <Badge variant="subtle">Hide Passwords</Badge>
                            </Show>
                            <Show when={col.manage}>
                              <Badge variant="filledBlue">Manage</Badge>
                            </Show>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>

            {/* Actions Bar */}
            <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
              <Button variant="filled" size="sm" onClick={state.handleEditClick}>
                Edit Role & Permissions
              </Button>
              <Show when={state.isInvited()}>
                <Button variant="outline" size="sm" onClick={state.handleReinviteClick}>
                  Resend Invite
                </Button>
              </Show>
              <Show when={!state.isRevoked() && !state.isInvited()}>
                <Button variant="outline" size="sm" onClick={state.handleRevokeClick}>
                  Revoke Access
                </Button>
              </Show>
              <Show when={state.isRevoked()}>
                <Button variant="outline" size="sm" onClick={state.handleRestoreClick}>
                  Restore Access
                </Button>
              </Show>
              <Button
                variant="outline"
                size="sm"
                onClick={state.handleRemoveClick}
                class="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Remove from Org
              </Button>
            </div>
          </div>
        )}
      </Show>
    </div>
  )
}
