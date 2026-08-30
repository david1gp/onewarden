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
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage access, sessions, SSO associations, and organization roles.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={state.reloadUsers}>
            <Icon path={vaultSvgIcons.refresh} class="mr-1.5 size-3.5" />
            Reload users
          </Button>
          <Button variant="outline" size="sm" onClick={state.forceClientResync}>
            <Icon path={vaultSvgIcons.server} class="mr-1.5 size-3.5" />
            Force client resync
          </Button>
          <Button variant="filledBlue" size="sm" class="h-8" onClick={state.invite}>
            <Icon path={vaultSvgIcons.userPlus} class="mr-1.5 size-3.5" />
            Invite user
          </Button>
        </div>
      </div>
      <Input
        type="search"
        value={p.state.search().query}
        onInput={state.search}
        placeholder="Search users by name, email, status, or role"
        aria-label="Search users"
        class="mb-4 w-full"
      />
      <div class="mb-3 flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
        <span>
          Showing {p.state.filteredUsers().length} of {p.state.users().length} users
        </span>
        <span>Click an organization to edit its role.</span>
      </div>
      <div class="space-y-4">
        <For each={p.state.filteredUsers()} fallback={<CardWrapper>No users match this search.</CardWrapper>}>
          {(user) => (
            <CardWrapper class="overflow-hidden">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="truncate font-semibold">{user.name}</h3>
                    <AdminStatusBadge status={user.role} />
                    <AdminStatusBadge status={user.status} />
                    <Show when={user.twoFactorEnabled}>
                      <AdminStatusBadge status="twoFactor" />
                    </Show>
                    <Show when={user.emailVerified}>
                      <AdminStatusBadge status="verified" />
                    </Show>
                    <Show when={user.ssoIdentifier}>
                      <AdminStatusBadge status="sso" />
                    </Show>
                    <Show when={user.overridden}>
                      <AdminStatusBadge status="overridden" />
                    </Show>
                  </div>
                  <p class="truncate text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                </div>
                <Button variant="outline" size="sm" class="h-8" onClick={state.open(user.id)}>
                  <Icon path={vaultSvgIcons.eye} class="mr-1.5 size-3.5" />
                  View details
                </Button>
              </div>
              <dl class="mt-4 grid min-w-0 gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
                <div class="min-w-0">
                  <dt class="text-slate-500 dark:text-slate-400">SSO identifier</dt>
                  <dd class="mt-1 break-all">{user.ssoIdentifier ?? "Not associated"}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Created</dt>
                  <dd class="mt-1">{p.state.formatDateTime(user.createdAt)}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Last active</dt>
                  <dd class="mt-1">{p.state.formatDateTime(user.lastActiveAt)}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Ciphers</dt>
                  <dd class="mt-1">{user.cipherCount ?? 0}</dd>
                </div>
                <div>
                  <dt class="text-slate-500 dark:text-slate-400">Attachments</dt>
                  <dd class="mt-1">
                    {user.attachmentCount ?? 0} ({p.state.formatAttachmentSize(user.attachmentSizeBytes ?? 0)})
                  </dd>
                </div>
                <div class="min-w-0">
                  <dt class="text-slate-500 dark:text-slate-400">Organizations</dt>
                  <dd class="mt-1 flex flex-wrap items-center gap-1.5">
                    <Show when={(user.organizations ?? []).length > 0} fallback={<span>None</span>}>
                      <For each={user.organizations ?? []}>
                        {(organization) => (
                          <Button
                            variant="outline"
                            size="sm"
                            class="h-auto min-h-8 max-w-full justify-start px-2 py-1 text-left"
                            onClick={state.editOrganizationRole(user.id, organization.id)}
                            title={`Edit ${organization.name} role`}
                          >
                            <Icon path={vaultSvgIcons.edit} class="mr-1.5 size-3.5 shrink-0" />
                            <span class="truncate">{organization.name}</span>
                            <AdminStatusBadge status={organization.role} />
                          </Button>
                        )}
                      </For>
                    </Show>
                  </dd>
                </div>
              </dl>
            </CardWrapper>
          )}
        </For>
      </div>
    </section>
  )
}
