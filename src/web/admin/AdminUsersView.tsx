import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import type { AdminShellState } from "./AdminShellState.js"
import { AdminStatusBadge } from "./AdminStatusBadge.jsx"
import { adminUsersViewStateCreate } from "./adminUsersViewStateCreate.js"

export function AdminUsersView(p: { state: AdminShellState }) {
  const state = adminUsersViewStateCreate(p.state)

  return (
    <section aria-labelledby="admin-users-title">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="admin-users-title" class="text-2xl font-bold">
            Users
          </h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage access, roles, and account status.</p>
        </div>
        <Button variant="filledBlue" class="h-8" onClick={state.invite}>
          <Icon path={vaultSvgIcons.userPlus} class="mr-1.5 size-3.5" />
          Invite user
        </Button>
      </div>
      <Input
        type="search"
        value={p.state.search().query}
        onInput={state.search}
        placeholder="Search users by name, email, status, or role"
        aria-label="Search users"
        class="mb-4 w-full"
      />
      <div class="space-y-3">
        <For each={p.state.filteredUsers()} fallback={<CardWrapper>No users match this search.</CardWrapper>}>
          {(user) => (
            <CardWrapper class="grid gap-3 sm:grid-cols-[minmax(0,2fr)_auto_auto_auto] sm:items-center">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-semibold">{user.name}</h3>
                  <Show when={user.overridden}>
                    <AdminStatusBadge status="overridden" />
                  </Show>
                </div>
                <p class="truncate text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
              </div>
              <AdminStatusBadge status={user.role} />
              <AdminStatusBadge status={user.status} />
              <Button variant="outline" size="sm" class="h-8" onClick={state.open(user.id)}>
                <Icon path={vaultSvgIcons.eye} class="mr-1.5 size-3.5" />
                View details
              </Button>
            </CardWrapper>
          )}
        </For>
      </div>
    </section>
  )
}
