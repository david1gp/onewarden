import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationGroupDetailProps,
  organizationGroupDetailStateCreate,
} from "./organizationGroupDetailStateCreate.js"

export function OrganizationGroupDetail(props: OrganizationGroupDetailProps): JSX.Element {
  const state = organizationGroupDetailStateCreate(props)

  return (
    <div class="flex h-full flex-col overflow-y-auto bg-white p-6 dark:bg-slate-900">
      <Show when={state.hasBack()}>
        <div class="mb-4 md:hidden">
          <Button variant="outline" size="sm" class="h-8" onClick={state.handleBackClick}>
            <Icon path={vaultSvgIcons.arrowLeft} class="mr-1.5 size-3.5" />
            Back to groups
          </Button>
        </div>
      </Show>
      <Show
        when={state.group()}
        fallback={
          <div class="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <svg
              class="mb-3 size-12 stroke-current stroke-1 opacity-40"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d={vaultSvgIcons.workVault} fill="currentColor" />
            </svg>
            <p class="font-medium text-sm">Select a group to view member assignments and collection permissions</p>
          </div>
        }
      >
        {(grp) => (
          <div class="space-y-6">
            {/* Header */}
            <div class="flex items-start justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
              <div class="flex items-center gap-4">
                <div class="flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <svg class="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={vaultSvgIcons.workVault} />
                  </svg>
                </div>
                <div>
                  <h2 class="font-bold text-slate-900 text-lg dark:text-slate-100">{grp().name}</h2>
                  <p class="font-mono text-slate-500 text-sm dark:text-slate-400">ID: {grp().id}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Show when={grp().externalId}>
                  <Badge variant="subtle">External: {grp().externalId}</Badge>
                </Show>
                <Show when={grp().accessAll}>
                  <Badge variant="filledBlue">All Collections Access</Badge>
                </Show>
              </div>
            </div>

            {/* Group Summary Card */}
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Members</span>
                  <p class="font-semibold text-slate-800 dark:text-slate-200">
                    {state.assignedMembers().length} assigned
                  </p>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Collections</span>
                  <p class="font-semibold text-slate-800 dark:text-slate-200">
                    {grp().accessAll ? "All Collections" : `${state.assignedCollections().length} assigned`}
                  </p>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Access Scope</span>
                  <p class="font-semibold text-slate-800 dark:text-slate-200">
                    {grp().accessAll ? "Full Organization" : "Restricted"}
                  </p>
                </div>
              </div>
            </div>

            {/* Assigned Members Section */}
            <div>
              <h3 class="font-semibold text-slate-900 text-sm dark:text-slate-100">Assigned Members</h3>
              <Show
                when={state.assignedMembers().length > 0}
                fallback={
                  <p class="mt-2 text-slate-500 text-sm italic dark:text-slate-400">
                    No members are currently in this group.
                  </p>
                }
              >
                <div class="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  <For each={state.assignedMembers()}>
                    {(member) => (
                      <div class="flex items-center justify-between p-3 text-sm">
                        <div>
                          <p class="font-medium text-slate-800 dark:text-slate-200">{member.name}</p>
                          <Show when={member.email && member.email !== member.name}>
                            <p class="text-slate-600 text-sm">{member.email}</p>
                          </Show>
                        </div>
                        <span class="font-mono text-sm text-slate-600">ID: {member.id}</span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Assigned Collections Section */}
            <div>
              <h3 class="font-semibold text-slate-900 text-sm dark:text-slate-100">Collection Access</h3>
              <Show
                when={!grp().accessAll}
                fallback={
                  <div class="mt-2 rounded-md border border-blue-200 bg-blue-50/50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                    This group has access to all collections in the organization.
                  </div>
                }
              >
                <Show
                  when={state.assignedCollections().length > 0}
                  fallback={
                    <p class="mt-2 text-slate-500 text-sm italic dark:text-slate-400">
                      No specific collections assigned. Members in this group have no collection access through this
                      group.
                    </p>
                  }
                >
                  <div class="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                    <For each={state.assignedCollections()}>
                      {(colAccess) => (
                        <div class="flex items-center justify-between p-3 text-sm">
                          <span class="font-medium text-slate-800 dark:text-slate-200">{colAccess.name}</span>
                          <div class="flex items-center gap-1.5">
                            <Show when={colAccess.readOnly}>
                              <Badge variant="subtle">Read-Only</Badge>
                            </Show>
                            <Show when={colAccess.hidePasswords}>
                              <Badge variant="subtle">Hide Passwords</Badge>
                            </Show>
                            <Show when={colAccess.manage}>
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

            {/* Actions */}
            <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
              <Button variant="filled" size="sm" class="h-8" onClick={state.handleEditClick}>
                <Icon path={vaultSvgIcons.edit} class="mr-1.5 size-3.5" />
                Edit Group
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={state.handleDeleteClick}
              >
                <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                Delete Group
              </Button>
            </div>
          </div>
        )}
      </Show>
    </div>
  )
}
