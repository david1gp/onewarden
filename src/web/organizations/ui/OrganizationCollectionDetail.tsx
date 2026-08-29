import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationCollectionDetailProps,
  organizationCollectionDetailStateCreate,
} from "./organizationCollectionDetailStateCreate.js"

export function OrganizationCollectionDetail(props: OrganizationCollectionDetailProps): JSX.Element {
  const state = organizationCollectionDetailStateCreate(props)

  return (
    <div class="flex h-full flex-col overflow-y-auto bg-white p-6 dark:bg-slate-900">
      <Show when={state.hasBack()}>
        <div class="mb-4 md:hidden">
          <Button variant="outline" size="sm" onClick={state.handleBackClick}>
            Back to collections
          </Button>
        </div>
      </Show>
      <Show
        when={state.collection()}
        fallback={
          <div class="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <svg
              class="mb-3 size-12 stroke-current stroke-1 opacity-40"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path d={vaultSvgIcons.sharedVault} fill="currentColor" />
            </svg>
            <p class="font-medium text-sm">Select a collection to view assignments and settings</p>
          </div>
        }
      >
        {(col) => (
          <div class="space-y-6">
            {/* Header */}
            <div class="flex items-start justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
              <div class="flex items-center gap-4">
                <div class="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <svg class="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={vaultSvgIcons.sharedVault} />
                  </svg>
                </div>
                <div>
                  <h2 class="font-bold text-slate-900 text-lg dark:text-slate-100">{col().name}</h2>
                  <p class="font-mono text-slate-500 text-xs dark:text-slate-400">ID: {col().id}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Show when={col().externalId}>
                  <Badge variant="subtle">External: {col().externalId}</Badge>
                </Show>
              </div>
            </div>

            {/* Collection Metadata Card */}
            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Organization ID</span>
                  <p class="font-mono text-slate-800 dark:text-slate-200 truncate">{col().organizationId}</p>
                </div>
                <div>
                  <span class="text-slate-500 dark:text-slate-400">Assigned Members</span>
                  <p class="font-semibold text-slate-800 dark:text-slate-200">
                    {col().users?.length ?? 0} direct assignments
                  </p>
                </div>
              </div>
            </div>

            {/* Assigned Users List */}
            <div>
              <h3 class="font-semibold text-slate-900 text-sm dark:text-slate-100">Assigned Members</h3>
              <Show
                when={(col().users?.length ?? 0) > 0}
                fallback={
                  <p class="mt-2 text-slate-500 text-xs italic dark:text-slate-400">
                    No members specifically assigned. Organization owners and admins have default access.
                  </p>
                }
              >
                <div class="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  <For each={col().users}>
                    {(userAccess) => (
                      <div class="flex items-center justify-between p-3 text-xs">
                        <span class="font-medium text-slate-800 dark:text-slate-200">
                          {userAccess.name || userAccess.id}
                        </span>
                        <div class="flex items-center gap-1.5">
                          <Show when={userAccess.readOnly}>
                            <Badge variant="subtle">Read-Only</Badge>
                          </Show>
                          <Show when={userAccess.hidePasswords}>
                            <Badge variant="subtle">Hide Passwords</Badge>
                          </Show>
                          <Show when={userAccess.manage}>
                            <Badge variant="filledBlue">Manage</Badge>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Action Buttons */}
            <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
              <Button variant="filled" size="sm" onClick={state.handleEditClick}>
                Edit Collection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={state.handleDeleteClick}
                class="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Delete Collection
              </Button>
            </div>
          </div>
        )}
      </Show>
    </div>
  )
}
