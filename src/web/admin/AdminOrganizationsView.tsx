import { For } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import type { AdminShellState } from "./AdminShellState.js"
import { AdminStatusBadge } from "./AdminStatusBadge.jsx"
import { adminOrganizationsViewStateCreate } from "./adminOrganizationsViewStateCreate.js"

export function AdminOrganizationsView(p: { state: AdminShellState }) {
  const state = adminOrganizationsViewStateCreate(p.state)

  return (
    <section aria-labelledby="admin-organizations-title">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="admin-organizations-title" class="text-2xl font-bold">
            Organizations
          </h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Review organization identity, usage, and billing details.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={state.reloadOrganizations}>
          <Icon path={vaultSvgIcons.refresh} class="mr-1.5 size-3.5" />
          Reload organizations
        </Button>
      </div>
      <Input
        type="search"
        value={p.state.search().query}
        onInput={state.search}
        placeholder="Search organizations by name, owner, billing email, or UUID"
        aria-label="Search organizations"
        class="mb-4 w-full"
      />
      <div class="space-y-3">
        <For
          each={p.state.filteredOrganizations()}
          fallback={<CardWrapper>No organizations match this search.</CardWrapper>}
        >
          {(organization) => (
            <CardWrapper class="overflow-hidden">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                  <div
                    class="flex size-12 shrink-0 items-center justify-center rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                    role="img"
                    aria-label={`${organization.name} organization icon`}
                  >
                    <Icon path={vaultSvgIcons.sharedVault} class="size-7" />
                  </div>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="truncate font-semibold">{organization.name}</h3>
                      <AdminStatusBadge status={organization.plan} />
                      <AdminStatusBadge status={organization.status} />
                    </div>
                    <p class="truncate text-sm text-slate-600 dark:text-slate-400">Owner: {organization.ownerName}</p>
                    <p class="truncate text-sm text-slate-600 dark:text-slate-400">{organization.billingEmail}</p>
                    <p class="break-all font-mono text-sm text-slate-500 dark:text-slate-400">{organization.uuid}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={state.open(organization.id)}>
                  <Icon path={vaultSvgIcons.eye} class="mr-1.5 size-3.5" />
                  View details
                </Button>
              </div>
              <dl class="mt-4 grid min-w-0 gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Users</dt>
                  <dd class="mt-1">{organization.memberCount}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Ciphers</dt>
                  <dd class="mt-1">{organization.cipherCount}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Attachments</dt>
                  <dd class="mt-1">
                    {organization.attachmentCount} ({p.state.formatAttachmentSize(organization.attachmentSizeBytes)})
                  </dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Collections</dt>
                  <dd class="mt-1">{organization.collectionCount}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Groups</dt>
                  <dd class="mt-1">{organization.groupCount}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Events</dt>
                  <dd class="mt-1">{organization.eventCount}</dd>
                </div>
              </dl>
            </CardWrapper>
          )}
        </For>
      </div>
    </section>
  )
}
