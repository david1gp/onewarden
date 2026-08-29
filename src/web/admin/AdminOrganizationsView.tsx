import { For } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { AdminShellState } from "./AdminShellState.js"
import { AdminStatusBadge } from "./AdminStatusBadge.jsx"
import { adminOrganizationsViewStateCreate } from "./adminOrganizationsViewStateCreate.js"

export function AdminOrganizationsView(p: { state: AdminShellState }) {
  const state = adminOrganizationsViewStateCreate(p.state)

  return (
    <section aria-labelledby="admin-organizations-title">
      <div class="mb-6">
        <h2 id="admin-organizations-title" class="text-2xl font-bold">
          Organizations
        </h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Review teams, plans, owners, and security policy.</p>
      </div>
      <Input
        type="search"
        value={p.state.search().query}
        onInput={state.search}
        placeholder="Search organizations by name, owner, or plan"
        aria-label="Search organizations"
        class="mb-4 w-full"
      />
      <div class="space-y-3">
        <For
          each={p.state.filteredOrganizations()}
          fallback={<CardWrapper>No organizations match this search.</CardWrapper>}
        >
          {(organization) => (
            <CardWrapper class="grid gap-3 sm:grid-cols-[minmax(0,2fr)_auto_auto_auto] sm:items-center">
              <div class="min-w-0">
                <h3 class="truncate font-semibold">{organization.name}</h3>
                <p class="truncate text-sm text-slate-600 dark:text-slate-400">Owner: {organization.ownerName}</p>
              </div>
              <span class="text-sm">{organization.memberCount} members</span>
              <div class="flex flex-wrap gap-2">
                <AdminStatusBadge status={organization.plan} />
                <AdminStatusBadge status={organization.status} />
              </div>
              <Button variant="outline" size="sm" onClick={state.open(organization.id)}>
                View details
              </Button>
            </CardWrapper>
          )}
        </For>
      </div>
    </section>
  )
}
