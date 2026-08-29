import { For, type JSX, Show } from "solid-js"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AdminUsersCardProps, adminUsersCardStateCreate } from "./adminUsersCardStateCreate.js"

export function AdminUsersCard(props: AdminUsersCardProps): JSX.Element {
  const state = adminUsersCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Icon path={vaultSvgIcons.users} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Users Management</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Manage registered accounts, invite users, revoke sessions, and reset 2FA
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs"
            onClick={state.loadUsers}
            disabled={state.isLoading()}
          >
            <Icon path={vaultSvgIcons.refresh} class="mr-1 size-3.5" />
            Refresh
          </Button>
          <Button type="button" variant="filled" size="sm" class="text-xs" onClick={state.openInvite}>
            <Icon path={vaultSvgIcons.userPlus} class="mr-1 size-3.5" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Invite Modal / Box */}
      <Show when={state.isInviteOpen()}>
        <div class="my-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/40">
          <h3 class="font-semibold text-xs text-blue-900 dark:text-blue-200">Invite New User</h3>
          <form onSubmit={state.handleInviteUser} class="mt-2 flex max-w-md items-center gap-2">
            <label for="admin-invite-email" class="sr-only">
              User email
            </label>
            <Input
              id="admin-invite-email"
              type="email"
              placeholder="user@example.com"
              value={state.inviteEmail()}
              onInput={(e) => state.setInviteEmail(e.currentTarget.value)}
              required
              class="h-8 w-full text-xs"
            />
            <Button type="submit" variant="filled" size="sm" class="h-8 shrink-0 text-xs" disabled={state.isInviting()}>
              {state.isInviting() ? "Sending..." : "Send Invite"}
            </Button>
            <Button type="button" variant="ghost" size="sm" class="h-8 text-xs" onClick={state.closeInvite}>
              Cancel
            </Button>
          </form>
        </div>
      </Show>

      {/* Filter */}
      <div class="mt-4 flex items-center justify-between">
        <div class="relative w-full max-w-xs">
          <label for="admin-user-search" class="sr-only">
            Search users
          </label>
          <Input
            id="admin-user-search"
            type="text"
            placeholder="Search users..."
            value={state.searchQuery()}
            onInput={(e) => state.setSearchQuery(e.currentTarget.value)}
            class="h-8 w-full text-xs"
          />
        </div>
        <span class="text-xs text-slate-500">
          Total: {state.totalCount()} {state.totalCount() === 1 ? "user" : "users"}
        </span>
      </div>

      {/* Users table */}
      <div class="mt-4">
        <Show
          when={state.users().length > 0}
          fallback={
            <div class="py-12 text-center text-xs text-slate-500">
              {state.isLoading() ? "Loading users..." : "No users found."}
            </div>
          }
        >
          <div class="divide-y divide-slate-100 dark:divide-slate-800/80">
            <For each={state.users()}>
              {(user) => (
                <div class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between text-xs">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-slate-900 dark:text-slate-100">{user.name || user.email}</span>
                      <Show when={!user.userEnabled}>
                        <Badge
                          variant="subtle"
                          class="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[10px]"
                        >
                          Disabled
                        </Badge>
                      </Show>
                      <Show when={user.twoFactorEnabled}>
                        <Badge
                          variant="subtle"
                          class="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]"
                        >
                          2FA Active
                        </Badge>
                      </Show>
                    </div>
                    <div class="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{user.email}</span>
                      <span>•</span>
                      <span>Created: {new Date(user.createdAt).toLocaleDateString()}</span>
                      <Show when={user.lastActive}>
                        <span>•</span>
                        <span>Last active: {user.lastActive}</span>
                      </Show>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="text-[11px]"
                      onClick={() => state.handleDeauthUser(user)}
                      disabled={state.isActionRunning() && state.actionTargetId() === user.id}
                      title="Deauthorize all sessions"
                    >
                      Deauth
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="text-[11px]"
                      onClick={() => state.handleToggleUserStatus(user)}
                      disabled={state.isActionRunning() && state.actionTargetId() === user.id}
                    >
                      {user.userEnabled ? "Disable" : "Enable"}
                    </Button>
                    <Show when={user.twoFactorEnabled}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="text-[11px] text-amber-600 dark:text-amber-400"
                        onClick={() => state.handleRemove2fa(user)}
                        disabled={state.isActionRunning() && state.actionTargetId() === user.id}
                      >
                        Reset 2FA
                      </Button>
                    </Show>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="text-[11px]"
                      onClick={() => state.handleResendInvite(user)}
                      disabled={state.isActionRunning() && state.actionTargetId() === user.id}
                    >
                      Reinvite
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="text-[11px] text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      onClick={() => state.handleDeleteUser(user)}
                      disabled={state.isActionRunning() && state.actionTargetId() === user.id}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </CardWrapper>
  )
}
