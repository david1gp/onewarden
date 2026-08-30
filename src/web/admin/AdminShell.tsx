import { For, Match, Show, Switch } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
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
                      <dl class="grid gap-3 text-sm sm:grid-cols-2">
                        <div class="min-w-0">
                          <dt class="text-slate-500">SSO identifier</dt>
                          <dd class="mt-1 break-all">{user.ssoIdentifier ?? "Not associated"}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Ciphers</dt>
                          <dd class="mt-1">{user.cipherCount ?? 0}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Attachments</dt>
                          <dd class="mt-1">
                            {user.attachmentCount ?? 0} ({p.state.formatAttachmentSize(user.attachmentSizeBytes ?? 0)})
                          </dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Created</dt>
                          <dd class="mt-1">{p.state.formatDateTime(user.createdAt)}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Last active</dt>
                          <dd class="mt-1">{p.state.formatDateTime(user.lastActiveAt)}</dd>
                        </div>
                        <div class="sm:col-span-2">
                          <dt class="text-slate-500">Organizations ({user.organizationCount})</dt>
                          <dd class="mt-1 flex flex-wrap gap-1.5">
                            <Show when={(user.organizations ?? []).length > 0} fallback={<span>None</span>}>
                              <For each={user.organizations ?? []}>
                                {(organization) => (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    class="h-auto min-h-8 max-w-full justify-start px-2 py-1 text-left"
                                    onClick={() => p.state.openUserOrganizationRole(user.id, organization.id)}
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
                      <div class="flex flex-wrap justify-end gap-2">
                        <Show when={user.twoFactorEnabled}>
                          <Button variant="outline" size="sm" onClick={state.remove2fa}>
                            <Icon path={vaultSvgIcons.shieldAlert} class="mr-1.5 size-3.5" />
                            Remove all 2FA
                          </Button>
                        </Show>
                        <Button variant="outline" size="sm" onClick={state.deauthorizeSessions}>
                          <Icon path={vaultSvgIcons.server} class="mr-1.5 size-3.5" />
                          Deauthorize sessions
                        </Button>
                        <Show when={user.ssoIdentifier}>
                          <Button variant="outline" size="sm" onClick={state.removeSsoAssociation}>
                            <Icon path={vaultSvgIcons.key} class="mr-1.5 size-3.5" />
                            Remove SSO association
                          </Button>
                        </Show>
                        <Button variant="outline" size="sm" onClick={state.toggleUserStatus}>
                          <Icon
                            path={user.status === "disabled" ? vaultSvgIcons.shieldCheck : vaultSvgIcons.lock}
                            class="mr-1.5 size-3.5"
                          />
                          {user.status === "disabled" ? "Enable user" : "Disable user"}
                        </Button>
                        <Show when={user.status === "invited"}>
                          <Button variant="outline" size="sm" onClick={state.resendInvitation}>
                            <Icon path={vaultSvgIcons.userPlus} class="mr-1.5 size-3.5" />
                            Resend invitation
                          </Button>
                        </Show>
                        <Button variant="outlineRed" size="sm" onClick={state.deleteUser}>
                          <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                          Delete user
                        </Button>
                      </div>
                    </div>
                  )}
                </Show>
              </Match>
              <Match when={p.state.dialog()?.kind === "organizationRole"}>
                <Show when={p.state.selectedUser()} keyed>
                  {(user) => (
                    <Show when={p.state.selectedUserOrganization()} keyed>
                      {(organization) => (
                        <form class="space-y-4" onSubmit={state.saveOrganizationRole}>
                          <div>
                            <h3 class="font-semibold">{organization.name}</h3>
                            <p class="text-sm text-slate-600 dark:text-slate-400">
                              {user.name} · {user.email}
                            </p>
                          </div>
                          <div class="space-y-2">
                            <label for="admin-user-organization-role" class="font-semibold">
                              Organization role
                            </label>
                            <SelectSingleNative
                              id="admin-user-organization-role"
                              valueSignal={p.state.organizationRole}
                              getOptions={() => p.state.organizationRoleOptions}
                              valueText={p.state.organizationRoleLabel}
                              aria-label="Organization role"
                              class="w-full"
                            />
                          </div>
                          <div class="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={p.state.closeDialog}>
                              <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                              Cancel
                            </Button>
                            <Button type="submit" variant="filledBlue" size="sm">
                              <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
                              Change role
                            </Button>
                          </div>
                        </form>
                      )}
                    </Show>
                  )}
                </Show>
              </Match>
              <Match when={p.state.dialog()?.kind === "organizationDetails"}>
                <Show when={p.state.selectedOrganization()} keyed>
                  {(organization) => (
                    <div class="space-y-4">
                      <div>
                        <h3 class="font-semibold">{organization.name}</h3>
                        <p class="text-sm text-slate-600 dark:text-slate-400">
                          Owner: {organization.ownerName} · {organization.billingEmail}
                        </p>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <AdminStatusBadge status={organization.plan} />
                        <AdminStatusBadge status={organization.status} />
                      </div>
                      <dl class="grid gap-3 text-sm sm:grid-cols-2">
                        <div class="sm:col-span-2">
                          <dt class="text-slate-500">UUID</dt>
                          <dd class="mt-1 break-all font-mono">{organization.uuid}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Users</dt>
                          <dd>{organization.memberCount}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Ciphers</dt>
                          <dd>{organization.cipherCount}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Attachments</dt>
                          <dd>
                            {organization.attachmentCount} (
                            {p.state.formatAttachmentSize(organization.attachmentSizeBytes)})
                          </dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Collections</dt>
                          <dd>{organization.collectionCount}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Groups</dt>
                          <dd>{organization.groupCount}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Events</dt>
                          <dd>{organization.eventCount}</dd>
                        </div>
                        <div>
                          <dt class="text-slate-500">Created</dt>
                          <dd>{p.state.formatDateTime(organization.createdAt)}</dd>
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
                      <div class="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={state.toggleOrganizationStatus}>
                          <Icon
                            path={organization.status === "disabled" ? vaultSvgIcons.shieldCheck : vaultSvgIcons.lock}
                            class="mr-1.5 size-3.5"
                          />
                          {organization.status === "disabled" ? "Enable organization" : "Disable organization"}
                        </Button>
                        <Button variant="outlineRed" size="sm" onClick={state.deleteOrganization}>
                          <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                          Delete organization
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
              <Show when={confirmation.requiredInput !== undefined}>
                <div class="mt-4 space-y-2">
                  <label for="admin-confirmation-input" class="font-semibold">
                    Organization UUID
                  </label>
                  <Input
                    id="admin-confirmation-input"
                    value={p.state.confirmationInput.get()}
                    onInput={state.confirmationInput}
                    autocomplete="off"
                    spellcheck={false}
                    placeholder={confirmation.requiredInput}
                    aria-label="Organization UUID confirmation"
                    class="w-full font-mono"
                  />
                </div>
              </Show>
              <div class="mt-6 flex justify-end gap-2">
                <Button variant="outline" class="h-8" onClick={p.state.closeConfirmation}>
                  <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                  Cancel
                </Button>
                <Button variant="filledRed" class="h-8" onClick={state.confirm}>
                  <Icon
                    path={confirmation.action === "deleteOrganization" ? vaultSvgIcons.trash : vaultSvgIcons.check}
                    class="mr-1.5 size-3.5"
                  />
                  {confirmation.action === "deleteOrganization" ? "Delete organization" : "Confirm"}
                </Button>
              </div>
            </CardWrapper>
          </div>
        )}
      </Show>
    </div>
  )
}
