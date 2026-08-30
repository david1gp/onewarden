import { For, Match, Show, Switch } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import { AdminDiagnosticsView } from "./AdminDiagnosticsView.jsx"
import { AdminOrganizationsView } from "./AdminOrganizationsView.jsx"
import { adminShellStateCreate } from "./adminShellStateCreate.js"
import type { AdminShellState } from "./AdminShellState.js"
import { AdminSettingsView } from "./AdminSettingsView.jsx"
import { AdminStatusBadge } from "./AdminStatusBadge.jsx"
import { AdminUsersView } from "./AdminUsersView.jsx"

export function AdminShell(p: { state: AdminShellState }) {
  const state = adminShellStateCreate(p.state)

  return (
    <div class="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section
        aria-labelledby="admin-page-title"
        class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 id="admin-page-title" class="text-xl font-bold">
                OneWarden Administration
              </h1>
              <p class="text-sm text-slate-600 dark:text-slate-400">Self-hosted server workspace</p>
            </div>
            <Badge variant="filledBlue" class="border-sky-700 bg-sky-700">
              Demo mode
            </Badge>
          </div>
        </div>
      </section>
      <div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[13rem_minmax(0,1fr)] lg:px-8">
        <nav aria-label="Admin sections" class="flex flex-wrap gap-2 md:flex-col md:flex-nowrap">
          <For each={state.sections}>
            {(section) => (
              <Button
                variant={state.sectionVariant(section.id)}
                class="shrink-0 justify-start"
                onClick={state.selectSection(section.id)}
              >
                {section.label}
              </Button>
            )}
          </For>
        </nav>
        <main id="main-content" tabindex="-1" class="min-w-0 focus:outline-none">
          <Show when={p.state.feedback()} keyed>
            {(feedback) => (
              <div role="status">
                <CardWrapper class="mb-4 flex items-center justify-between gap-3 border-blue-300 bg-blue-50 dark:bg-blue-950">
                  <span>
                    <AdminStatusBadge status={feedback.kind} /> <span class="ml-2">{feedback.message}</span>
                  </span>
                  <Button variant="ghost" size="sm" class="h-8" onClick={p.state.clearFeedback}>
                    <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                    Dismiss
                  </Button>
                </CardWrapper>
              </div>
            )}
          </Show>
          <Switch>
            <Match when={p.state.activeSection() === "settings"}>
              <AdminSettingsView state={p.state} />
            </Match>
            <Match when={p.state.activeSection() === "users"}>
              <AdminUsersView state={p.state} />
            </Match>
            <Match when={p.state.activeSection() === "organizations"}>
              <AdminOrganizationsView state={p.state} />
            </Match>
            <Match when={p.state.activeSection() === "diagnostics"}>
              <AdminDiagnosticsView state={p.state} />
            </Match>
          </Switch>
        </main>
      </div>

      <Show when={p.state.dialog() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <CardWrapper
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dialog-title"
            class="max-h-[90vh] w-full max-w-lg overflow-y-auto"
          >
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 id="admin-dialog-title" class="text-lg font-semibold">
                {state.dialogTitle()}
              </h2>
              <Button variant="ghost" size="sm" class="h-8" aria-label="Close dialog" onClick={p.state.closeDialog}>
                <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                Close
              </Button>
            </div>
            <Switch>
              <Match when={p.state.dialog()?.kind === "inviteUser"}>
                <form class="space-y-4" onSubmit={state.invite}>
                  <Input
                    type="email"
                    required
                    placeholder="person@example.com"
                    aria-label="User email"
                    class="w-full"
                  />
                  <div class="flex justify-end gap-2">
                    <Button variant="outline" class="h-8" onClick={p.state.closeDialog}>
                      <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                      Cancel
                    </Button>
                    <Button type="submit" variant="filledBlue" class="h-8">
                      <Icon path={vaultSvgIcons.send} class="mr-1.5 size-3.5" />
                      Send invitation
                    </Button>
                  </div>
                </form>
              </Match>
              <Match when={p.state.dialog()?.kind === "userDetails"}>
                <Show when={p.state.selectedUser()} keyed>
                  {(user) => (
                    <div class="space-y-4">
                      <div>
                        <h3 class="font-semibold">{user.name}</h3>
                        <p class="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <AdminStatusBadge status={user.role} />
                        <AdminStatusBadge status={user.status} />
                        <Badge variant="outline">2FA {state.twoFactorLabel(user.twoFactorEnabled)}</Badge>
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt class="text-slate-500">Organizations</dt>
                          <dd>{user.organizationCount}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Created</dt>
                          <dd>{user.createdAt}</dd>
                        </div>
                        <div class="col-span-2">
                          <dt class="text-slate-500">Last active</dt>
                          <dd>{user.lastActiveAt ?? "Never"}</dd>
                        </div>
                      </dl>
                      <div class="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" class="h-8" onClick={state.disableUser}>
                          <Icon path={vaultSvgIcons.lock} class="mr-1.5 size-3.5" />
                          Disable user
                        </Button>
                        <Button variant="outlineRed" class="h-8" onClick={state.deleteUser}>
                          <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                          Delete user
                        </Button>
                      </div>
                    </div>
                  )}
                </Show>
              </Match>
              <Match when={p.state.dialog()?.kind === "organizationDetails"}>
                <Show when={p.state.selectedOrganization()} keyed>
                  {(organization) => (
                    <div class="space-y-4">
                      <div>
                        <h3 class="font-semibold">{organization.name}</h3>
                        <p class="text-sm text-slate-600 dark:text-slate-400">Owned by {organization.ownerName}</p>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <AdminStatusBadge status={organization.plan} />
                        <AdminStatusBadge status={organization.status} />
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt class="text-slate-500">Members</dt>
                          <dd>{organization.memberCount}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Created</dt>
                          <dd>{organization.createdAt}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Require 2FA</dt>
                          <dd>{state.requirementLabel(organization.twoFactorRequired)}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">SSO</dt>
                          <dd>{state.availabilityLabel(organization.ssoEnabled)}</dd>
                        </div>
                      </dl>
                      <div class="flex justify-end">
                        <Button
                          variant="outlineRed"
                          disabled={organization.status === "disabled"}
                          class="h-8"
                          onClick={state.disableOrganization}
                        >
                          <Icon path={vaultSvgIcons.lock} class="mr-1.5 size-3.5" />
                          Disable organization
                        </Button>
                      </div>
                    </div>
                  )}
                </Show>
              </Match>
            </Switch>
          </CardWrapper>
        </div>
      </Show>

      <Show when={p.state.confirmation()} keyed>
        {(confirmation) => (
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
            <CardWrapper
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="admin-confirmation-title"
              aria-describedby="admin-confirmation-description"
              class="w-full max-w-md"
            >
              <h2 id="admin-confirmation-title" class="text-lg font-semibold">
                {confirmation.title}
              </h2>
              <p id="admin-confirmation-description" class="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {confirmation.message}
              </p>
              <div class="mt-6 flex justify-end gap-2">
                <Button variant="outline" class="h-8" onClick={p.state.closeConfirmation}>
                  <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                  Cancel
                </Button>
                <Button variant="filledRed" class="h-8" onClick={state.confirm}>
                  <Icon path={vaultSvgIcons.check} class="mr-1.5 size-3.5" />
                  Confirm
                </Button>
              </div>
            </CardWrapper>
          </div>
        )}
      </Show>
    </div>
  )
}
