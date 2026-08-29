import { For } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { AdminSettingsOverride } from "./adminSettingsSchema.js"
import type { AdminShellState } from "./AdminShellState.js"
import { adminSettingsViewStateCreate } from "./adminSettingsViewStateCreate.js"

const settings: readonly { key: AdminSettingsOverride; label: string; description: string }[] = [
  { key: "signupsAllowed", label: "Allow new signups", description: "Let visitors create an account." },
  { key: "invitationsAllowed", label: "Allow invitations", description: "Let administrators invite users." },
  { key: "mailEnabled", label: "Mail delivery", description: "Send invitations and account notifications." },
  { key: "ssoEnabled", label: "Single sign-on", description: "Allow users to authenticate through SSO." },
  { key: "twoFactorEnabled", label: "Two-step login", description: "Make two-factor options available." },
  { key: "adminTokenDisabled", label: "Disable admin token", description: "Require authenticated admin access." },
]

export function AdminSettingsView(p: { state: AdminShellState }) {
  const state = adminSettingsViewStateCreate(p.state)

  return (
    <section aria-labelledby="admin-settings-title">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="admin-settings-title" class="text-2xl font-bold">
            Settings
          </h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Server policy and authentication controls.</p>
        </div>
        <Button variant="outline" onClick={state.reset}>
          Reset overrides
        </Button>
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <For each={settings}>
          {(setting) => (
            <CardWrapper class="flex items-start justify-between gap-4">
              <Checkbox
                id={`admin-setting-${setting.key}`}
                checked={p.state.settings()[setting.key]}
                onChange={state.toggle(setting.key)}
                class="flex-1"
              >
                <span class="block font-semibold">{setting.label}</span>
                <span class="mt-1 block text-sm text-slate-600 dark:text-slate-400">{setting.description}</span>
              </Checkbox>
              <For each={p.state.settings().overrides.filter((key) => key === setting.key)}>
                {() => (
                  <Badge variant="filledBlue" class="border-sky-700 bg-sky-700">
                    Overridden
                  </Badge>
                )}
              </For>
            </CardWrapper>
          )}
        </For>
      </div>
      <CardWrapper class="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p class="text-sm text-slate-600 dark:text-slate-400">Session lifetime</p>
          <p class="mt-1 font-semibold">{p.state.settings().sessionLifetimeMinutes} minutes</p>
        </div>
        <div>
          <p class="text-sm text-slate-600 dark:text-slate-400">Invitation expiration</p>
          <p class="mt-1 font-semibold">{p.state.settings().invitationExpirationHours} hours</p>
        </div>
      </CardWrapper>
    </section>
  )
}
