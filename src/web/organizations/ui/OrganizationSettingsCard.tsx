import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type OrganizationSettingsCardProps,
  organizationSettingsCardStateCreate,
} from "./organizationSettingsCardStateCreate.js"

export function OrganizationSettingsCard(props: OrganizationSettingsCardProps): JSX.Element {
  const state = organizationSettingsCardStateCreate(props)

  return (
    <div class="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <CardWrapper>
        <div class="mb-6">
          <h2 class="font-bold text-slate-900 text-lg dark:text-slate-100">Organization Settings</h2>
          <p class="text-slate-500 text-sm dark:text-slate-400">
            Manage your organization profile, billing contact, and capabilities.
          </p>
        </div>

        <Show when={state.org()} fallback={<p class="text-sm text-slate-500">No organization selected.</p>}>
          {(org) => (
            <form onSubmit={state.handleSave} class="space-y-6">
              <Show when={state.feedback()}>
                {(msg) => (
                  <div
                    class={`rounded-md p-3 text-sm font-medium ${
                      msg().error
                        ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300"
                        : "border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300"
                    }`}
                  >
                    {msg().text}
                  </div>
                )}
              </Show>

              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label class="block font-medium text-slate-700 text-sm dark:text-slate-300" for="org-name-input">
                    Organization Name
                  </label>
                  <Input
                    id="org-name-input"
                    type="text"
                    value={state.name()}
                    onInput={state.handleNameInput}
                    required
                    class="mt-1.5 w-full"
                    placeholder="Acme Corp"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 text-sm dark:text-slate-300" for="org-email-input">
                    Billing Email
                  </label>
                  <Input
                    id="org-email-input"
                    type="email"
                    value={state.billingEmail()}
                    onInput={state.handleBillingEmailInput}
                    required
                    class="mt-1.5 w-full"
                    placeholder="billing@example.com"
                  />
                </div>
              </div>

              {/* Readonly Info / Capabilities Grid */}
              <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <h3 class="font-semibold text-slate-800 text-sm uppercase tracking-wider dark:text-slate-200">
                  Plan & Subscription Details
                </h3>
                <div class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                  <div>
                    <span class="text-slate-500 dark:text-slate-400">Plan Type</span>
                    <p class="font-semibold text-slate-800 dark:text-slate-200">Enterprise (Self-Hosted)</p>
                  </div>
                  <div>
                    <span class="text-slate-500 dark:text-slate-400">Seats</span>
                    <p class="font-semibold text-slate-800 dark:text-slate-200">{org().seats ?? "Unlimited"}</p>
                  </div>
                  <div>
                    <span class="text-slate-500 dark:text-slate-400">Max Collections</span>
                    <p class="font-semibold text-slate-800 dark:text-slate-200">
                      {org().maxCollections ?? "Unlimited"}
                    </p>
                  </div>
                  <div>
                    <span class="text-slate-500 dark:text-slate-400">Keys Initialized</span>
                    <div class="mt-0.5">
                      <Badge variant={org().hasPublicAndPrivateKeys ? "filledGreen" : "subtle"}>
                        {org().hasPublicAndPrivateKeys ? "Configured" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-2">
                <Button variant="filled" class="h-8" type="submit" disabled={state.isSaving()}>
                  <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
                  {state.isSaving() ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </Show>
      </CardWrapper>
    </div>
  )
}
