import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type AdminOrganizationsCardProps,
  adminOrganizationsCardStateCreate,
} from "./adminOrganizationsCardStateCreate.js"

export function AdminOrganizationsCard(props: AdminOrganizationsCardProps): JSX.Element {
  const state = adminOrganizationsCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Icon path={vaultSvgIcons.workVault} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Organizations</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              View and manage organizations hosted on this server
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="text-sm"
          onClick={state.loadOrganizations}
          disabled={state.isLoading()}
        >
          <Icon path={vaultSvgIcons.refresh} class="mr-1 size-3.5" />
          Refresh
        </Button>
      </div>

      <div class="mt-6">
        <Show
          when={state.organizations().length > 0}
          fallback={
            <div class="py-12 text-center text-sm text-slate-500">
              {state.isLoading() ? "Loading organizations..." : "No organizations created on this instance yet."}
            </div>
          }
        >
          <div class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <For each={state.organizations()}>
              {(org) => (
                <div class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between text-sm">
                  <div>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{org.name}</span>
                    <div class="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <span>ID: {org.id}</span>
                      <Show when={org.user_count !== undefined}>
                        <span>•</span>
                        <span>{org.user_count} members</span>
                      </Show>
                      <Show when={org.cipher_count !== undefined}>
                        <span>•</span>
                        <span>{org.cipher_count} ciphers</span>
                      </Show>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="self-end text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 sm:self-center"
                    onClick={() => state.handleDeleteOrganization(org)}
                    disabled={state.isDeleting() && state.deleteTargetId() === org.id}
                  >
                    Delete Organization
                  </Button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </CardWrapper>
  )
}
