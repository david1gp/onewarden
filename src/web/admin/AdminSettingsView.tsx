import { type Accessor, type JSX, Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { Details } from "#ui/interactive/details/Details.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import type { AdminShellState } from "./AdminShellState.js"
import type { AdminSettingsPasswordKey } from "./adminSettingsSchema.js"
import { adminSettingsViewStateCreate } from "./adminSettingsViewStateCreate.js"
import { AdminBackupCard } from "./ui/AdminBackupCard.jsx"
import { AdminMailTestCard } from "./ui/AdminMailTestCard.jsx"

type SettingFrameProps = {
  id: string
  label: string
  description: string
  risk?: boolean
  riskDescription?: string
  configOverridden: Accessor<boolean>
  environmentOverridden: Accessor<boolean>
  class?: string
  children: JSX.Element
}

type EditableTextFieldProps = Omit<SettingFrameProps, "children"> & {
  value: Accessor<string>
  disabled: Accessor<boolean>
  onInput: (event: InputEvent & { currentTarget: HTMLInputElement }) => void
  inputType?: Accessor<"password" | "text">
  passwordKey?: AdminSettingsPasswordKey
  passwordToggleLabel?: Accessor<string>
  togglePasswordVisibility?: () => void
}

type EditableNumberFieldProps = Omit<SettingFrameProps, "children"> & {
  value: Accessor<number>
  disabled: Accessor<boolean>
  onInput: (event: InputEvent & { currentTarget: HTMLInputElement }) => void
}

type EditableCheckboxFieldProps = Omit<SettingFrameProps, "children"> & {
  checked: Accessor<boolean>
  disabled: Accessor<boolean>
  onChange: (checked: boolean) => void
}

type ReadOnlyFieldProps = Omit<SettingFrameProps, "children" | "configOverridden" | "environmentOverridden"> & {
  value: Accessor<string | number>
  inputType?: "password" | "text" | "number"
  passwordKey?: AdminSettingsPasswordKey
  passwordToggleLabel?: Accessor<string>
  togglePasswordVisibility?: () => void
}

function SettingFrame(p: SettingFrameProps) {
  return (
    <div
      class={classMerge("rounded-lg border p-3", p.class)}
      classList={{
        "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30": p.risk === true,
        "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30":
          p.risk !== true && p.configOverridden(),
        "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900": p.risk !== true && !p.configOverridden(),
      }}
    >
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <label for={p.id} class="font-semibold">
            {p.label}
          </label>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
        </div>
        <SettingIndicators configOverridden={p.configOverridden} environmentOverridden={p.environmentOverridden} />
      </div>
      {p.children}
      <Show when={p.risk && p.riskDescription}>
        <p class="mt-2 text-sm font-medium text-red-700 dark:text-red-300">{p.riskDescription}</p>
      </Show>
    </div>
  )
}

function SettingIndicators(p: { configOverridden: Accessor<boolean>; environmentOverridden: Accessor<boolean> }) {
  return (
    <span class="flex shrink-0 flex-wrap justify-end gap-1.5">
      <Show when={p.environmentOverridden()}>
        <Badge variant="filledBlue">Environment</Badge>
      </Show>
      <Show when={p.configOverridden()}>
        <Badge variant="filledYellow">Config override</Badge>
      </Show>
    </span>
  )
}

function EditableTextField(p: EditableTextFieldProps) {
  return (
    <SettingFrame {...p}>
      <div class="mt-3 flex gap-2">
        <Input
          id={p.id}
          type={p.inputType?.() ?? "text"}
          value={p.value()}
          onInput={p.onInput}
          disabled={p.disabled()}
          spellcheck={false}
          class="min-w-0 flex-1"
        />
        <Show when={p.passwordKey !== undefined}>
          <ButtonIconOnly
            icon={p.inputType?.() === "text" ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
            title={p.passwordToggleLabel?.() ?? "Show value"}
            aria-label={p.passwordToggleLabel?.() ?? "Show value"}
            onClick={p.togglePasswordVisibility}
            variant="outline"
            class="size-10 shrink-0"
            disabled={p.disabled()}
          />
        </Show>
      </div>
    </SettingFrame>
  )
}

function EditableNumberField(p: EditableNumberFieldProps) {
  return (
    <SettingFrame {...p}>
      <Input
        id={p.id}
        type="number"
        value={p.value()}
        onInput={p.onInput}
        disabled={p.disabled()}
        min={0}
        class="mt-3 w-full"
      />
    </SettingFrame>
  )
}

function EditableCheckboxField(p: EditableCheckboxFieldProps) {
  return (
    <div
      class="rounded-lg border p-3"
      classList={{
        "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30": p.risk === true,
        "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30":
          p.risk !== true && p.configOverridden(),
        "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900": p.risk !== true && !p.configOverridden(),
      }}
    >
      <div class="flex items-start justify-between gap-2">
        <Checkbox id={p.id} checked={p.checked()} onChange={p.onChange} disabled={p.disabled()} class="min-w-0 flex-1">
          <span class="block font-semibold">{p.label}</span>
          <span class="mt-1 block text-sm text-slate-600 dark:text-slate-400">{p.description}</span>
        </Checkbox>
        <SettingIndicators configOverridden={p.configOverridden} environmentOverridden={p.environmentOverridden} />
      </div>
      <Show when={p.risk && p.riskDescription}>
        <p class="mt-2 text-sm font-medium text-red-700 dark:text-red-300">{p.riskDescription}</p>
      </Show>
    </div>
  )
}

function ReadOnlyField(p: ReadOnlyFieldProps) {
  return (
    <div class="rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <label for={p.id} class="font-semibold">
            {p.label}
          </label>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
        </div>
        <span class="flex flex-wrap gap-1.5">
          <Badge variant="outline">Read-only</Badge>
          <Badge variant="filledBlue">Environment</Badge>
        </span>
      </div>
      <div class="mt-3 flex gap-2">
        <Input
          id={p.id}
          type={p.inputType ?? "text"}
          value={p.value()}
          readonly
          disabled={false}
          spellcheck={false}
          class="min-w-0 flex-1 bg-slate-200 dark:bg-slate-700"
        />
        <Show when={p.passwordKey !== undefined}>
          <ButtonIconOnly
            icon={p.passwordToggleLabel?.() === "Hide value" ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
            title={p.passwordToggleLabel?.() ?? "Show value"}
            aria-label={p.passwordToggleLabel?.() ?? "Show value"}
            onClick={p.togglePasswordVisibility}
            variant="outline"
            class="size-10 shrink-0"
          />
        </Show>
      </div>
    </div>
  )
}

function ReadOnlyCheckboxField(p: Omit<ReadOnlyFieldProps, "value" | "inputType"> & { checked: Accessor<boolean> }) {
  return (
    <div class="rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800">
      <div class="flex items-start justify-between gap-2">
        <Checkbox id={p.id} checked={p.checked()} onChange={() => undefined} disabled>
          <span class="block font-semibold">{p.label}</span>
          <span class="mt-1 block text-sm text-slate-600 dark:text-slate-400">{p.description}</span>
        </Checkbox>
        <span class="flex flex-wrap gap-1.5">
          <Badge variant="outline">Read-only</Badge>
          <Badge variant="filledBlue">Environment</Badge>
        </span>
      </div>
    </div>
  )
}

export function AdminSettingsView(p: { state: AdminShellState }) {
  const state = adminSettingsViewStateCreate(p.state)

  return (
    <section aria-labelledby="admin-settings-title">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="admin-settings-title" class="text-2xl font-bold">
            Settings
          </h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            A grouped demo of Vaultwarden policy, transport, authentication, and server settings.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="filledBlue">Demo local state</Badge>
          <Show when={p.state.settingsDirty()}>
            <Badge variant="filledYellow">Unsaved changes</Badge>
          </Show>
        </div>
      </div>

      <CardWrapper class="mb-4 border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
        <div class="flex items-start gap-3">
          <Icon path={vaultSvgIcons.cog} class="mt-0.5 size-5 shrink-0 text-slate-600 dark:text-slate-300" />
          <p class="text-sm text-slate-700 dark:text-slate-300">
            Editable values are saved to the demo configuration. <strong>Environment</strong> badges show values also
            supplied by the server environment; <strong>Config override</strong> highlights values written by this
            editor. Read-only values require an environment change and server restart.
          </p>
        </div>
      </CardWrapper>

      <Show when={p.state.adminTokenWarning()}>
        <CardWrapper role="alert" class="mb-4 border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40">
          <div class="flex items-start gap-3">
            <Icon path={vaultSvgIcons.shieldAlert} class="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div>
              <h3 class="font-semibold text-amber-900 dark:text-amber-100">Plain-text admin token</h3>
              <p class="mt-1 text-sm text-amber-800 dark:text-amber-200">
                The demo admin token is not an Argon2 PHC string. Use a generated Argon2 hash for a real server;
                changing this value does not deauthorize the current session.
              </p>
            </div>
          </div>
        </CardWrapper>
      </Show>

      <form class="space-y-4" onSubmit={state.save} onKeyDown={state.preventEnter}>
        <Details
          title="General settings"
          subtitle="Account policy, signups, limits, and admin access"
          icon={vaultSvgIcons.cog}
        >
          <div class="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
            <EditableTextField
              id="admin-setting-domain"
              label="Domain URL"
              description="Public URL used to access this server, including the protocol."
              value={() => p.state.settings().domain}
              onInput={state.textInput("domain")}
              configOverridden={state.configOverridden("domain")}
              environmentOverridden={state.environmentOverridden("domain")}
              disabled={state.disabled("domain")}
              class="md:col-span-2"
            />
            <EditableTextField
              id="admin-setting-invitation-org-name"
              label="Invitation organization name"
              description="Name shown in invitation emails not tied to a specific organization."
              value={() => p.state.settings().invitationOrgName}
              onInput={state.textInput("invitationOrgName")}
              configOverridden={state.configOverridden("invitationOrgName")}
              environmentOverridden={state.environmentOverridden("invitationOrgName")}
              disabled={state.disabled("invitationOrgName")}
            />
            <EditableTextField
              id="admin-setting-org-creation-users"
              label="Organization creation users"
              description="Comma-separated emails, all, or none."
              value={() => p.state.settings().orgCreationUsers}
              onInput={state.textInput("orgCreationUsers")}
              configOverridden={state.configOverridden("orgCreationUsers")}
              environmentOverridden={state.environmentOverridden("orgCreationUsers")}
              disabled={state.disabled("orgCreationUsers")}
            />
            <EditableCheckboxField
              id="admin-setting-web-vault-enabled"
              label="Enable web vault"
              description="Serve the bundled web vault to users."
              checked={() => p.state.settings().webVaultEnabled}
              onChange={state.toggle("webVaultEnabled")}
              configOverridden={state.configOverridden("webVaultEnabled")}
              environmentOverridden={state.environmentOverridden("webVaultEnabled")}
              disabled={state.disabled("webVaultEnabled")}
            />
            <EditableCheckboxField
              id="admin-setting-signupsAllowed"
              label="Allow new signups"
              description="Allow visitors to create accounts."
              checked={() => p.state.settings().signupsAllowed}
              onChange={state.toggle("signupsAllowed")}
              configOverridden={state.configOverridden("signupsAllowed")}
              environmentOverridden={state.environmentOverridden("signupsAllowed")}
              disabled={state.disabled("signupsAllowed")}
            />
            <EditableCheckboxField
              id="admin-setting-signups-verify"
              label="Require email verification"
              description="Require a verified email address before account access."
              checked={() => p.state.settings().signupsVerify}
              onChange={state.toggle("signupsVerify")}
              configOverridden={state.configOverridden("signupsVerify")}
              environmentOverridden={state.environmentOverridden("signupsVerify")}
              disabled={state.disabled("signupsVerify")}
            />
            <EditableCheckboxField
              id="admin-setting-invitationsAllowed"
              label="Allow invitations"
              description="Allow organization administrators to invite users."
              checked={() => p.state.settings().invitationsAllowed}
              onChange={state.toggle("invitationsAllowed")}
              configOverridden={state.configOverridden("invitationsAllowed")}
              environmentOverridden={state.environmentOverridden("invitationsAllowed")}
              disabled={state.disabled("invitationsAllowed")}
            />
            <EditableCheckboxField
              id="admin-setting-sends-allowed"
              label="Allow Sends"
              description="Allow users to create Bitwarden Sends."
              checked={() => p.state.settings().sendsAllowed}
              onChange={state.toggle("sendsAllowed")}
              configOverridden={state.configOverridden("sendsAllowed")}
              environmentOverridden={state.environmentOverridden("sendsAllowed")}
              disabled={state.disabled("sendsAllowed")}
            />
            <EditableCheckboxField
              id="admin-setting-emergency-access"
              label="Enable emergency access"
              description="Allow users to configure emergency access."
              checked={() => p.state.settings().emergencyAccessAllowed}
              onChange={state.toggle("emergencyAccessAllowed")}
              configOverridden={state.configOverridden("emergencyAccessAllowed")}
              environmentOverridden={state.environmentOverridden("emergencyAccessAllowed")}
              disabled={state.disabled("emergencyAccessAllowed")}
            />
            <EditableCheckboxField
              id="admin-setting-email-change"
              label="Allow email change"
              description="Allow users to change their account email address."
              checked={() => p.state.settings().emailChangeAllowed}
              onChange={state.toggle("emailChangeAllowed")}
              configOverridden={state.configOverridden("emailChangeAllowed")}
              environmentOverridden={state.environmentOverridden("emailChangeAllowed")}
              disabled={state.disabled("emailChangeAllowed")}
            />
            <EditableCheckboxField
              id="admin-setting-password-hints"
              label="Allow password hints"
              description="Allow users to set or show password hints."
              checked={() => p.state.settings().passwordHintsAllowed}
              onChange={state.toggle("passwordHintsAllowed")}
              configOverridden={state.configOverridden("passwordHintsAllowed")}
              environmentOverridden={state.environmentOverridden("passwordHintsAllowed")}
              disabled={state.disabled("passwordHintsAllowed")}
            />
            <EditableCheckboxField
              id="admin-setting-show-password-hint"
              label="Show password hint (Know the risks!)"
              description="Show hints directly in the web page when mail is unavailable."
              risk
              riskDescription="This can expose sensitive data without authentication and is not recommended for public instances."
              checked={() => p.state.settings().showPasswordHint}
              onChange={state.toggle("showPasswordHint")}
              configOverridden={state.configOverridden("showPasswordHint")}
              environmentOverridden={state.environmentOverridden("showPasswordHint")}
              disabled={state.disabled("showPasswordHint")}
            />
            <EditableCheckboxField
              id="admin-setting-twoFactorEnabled"
              label="Enable two-factor authentication"
              description="Make two-factor authentication options available."
              checked={() => p.state.settings().twoFactorEnabled}
              onChange={state.toggle("twoFactorEnabled")}
              configOverridden={state.configOverridden("twoFactorEnabled")}
              environmentOverridden={state.environmentOverridden("twoFactorEnabled")}
              disabled={state.disabled("twoFactorEnabled")}
            />
            <EditableNumberField
              id="admin-setting-user-attachment-limit"
              label="Per-user attachment limit (KB)"
              description="Maximum attachment storage allowed per user."
              value={() => p.state.settings().userAttachmentLimit}
              onInput={state.numberInput("userAttachmentLimit")}
              configOverridden={state.configOverridden("userAttachmentLimit")}
              environmentOverridden={state.environmentOverridden("userAttachmentLimit")}
              disabled={state.disabled("userAttachmentLimit")}
            />
            <EditableNumberField
              id="admin-setting-org-attachment-limit"
              label="Per-organization attachment limit (KB)"
              description="Maximum attachment storage allowed per organization."
              value={() => p.state.settings().orgAttachmentLimit}
              onInput={state.numberInput("orgAttachmentLimit")}
              configOverridden={state.configOverridden("orgAttachmentLimit")}
              environmentOverridden={state.environmentOverridden("orgAttachmentLimit")}
              disabled={state.disabled("orgAttachmentLimit")}
            />
            <EditableNumberField
              id="admin-setting-invitation-expiration"
              label="Invitation expiration (hours)"
              description="Lifetime of invitations and related verification tokens."
              value={() => p.state.settings().invitationExpirationHours}
              onInput={state.numberInput("invitationExpirationHours")}
              configOverridden={state.configOverridden("invitationExpirationHours")}
              environmentOverridden={state.environmentOverridden("invitationExpirationHours")}
              disabled={state.disabled("invitationExpirationHours")}
            />
            <EditableNumberField
              id="admin-setting-password-iterations"
              label="Password iterations"
              description="Server-side password hashing iterations; must be at least 100,000."
              value={() => p.state.settings().passwordIterations}
              onInput={state.numberInput("passwordIterations")}
              configOverridden={state.configOverridden("passwordIterations")}
              environmentOverridden={state.environmentOverridden("passwordIterations")}
              disabled={state.disabled("passwordIterations")}
            />
            <EditableTextField
              id="admin-setting-admin-token"
              label="Admin token / Argon2 PHC"
              description="Token used to authenticate this administration page."
              value={() => p.state.settings().adminToken}
              onInput={state.textInput("adminToken")}
              inputType={() => state.passwordType("adminToken")}
              passwordKey="adminToken"
              passwordToggleLabel={() => state.passwordToggleLabel("adminToken")}
              togglePasswordVisibility={state.togglePasswordVisibility("adminToken")}
              configOverridden={state.configOverridden("adminToken")}
              environmentOverridden={state.environmentOverridden("adminToken")}
              disabled={state.disabled("adminToken")}
              class="md:col-span-2"
            />
            <EditableCheckboxField
              id="admin-setting-adminTokenDisabled"
              label="Disable admin token (demo policy)"
              description="Demonstrate an installation that uses another access layer."
              checked={() => p.state.settings().adminTokenDisabled}
              onChange={state.toggle("adminTokenDisabled")}
              configOverridden={state.configOverridden("adminTokenDisabled")}
              environmentOverridden={state.environmentOverridden("adminTokenDisabled")}
              disabled={state.disabled("adminTokenDisabled")}
            />
          </div>
        </Details>

        <Details
          title="Advanced settings"
          subtitle="Network, icons, logging, rate limits, and safeguards"
          icon={vaultSvgIcons.server}
        >
          <div class="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
            <EditableTextField
              id="admin-setting-ip-header"
              label="Client IP header"
              description="Header used to identify the client IP behind a reverse proxy."
              value={() => p.state.settings().ipHeader}
              onInput={state.textInput("ipHeader")}
              configOverridden={state.configOverridden("ipHeader")}
              environmentOverridden={state.environmentOverridden("ipHeader")}
              disabled={state.disabled("ipHeader")}
            />
            <EditableTextField
              id="admin-setting-trusted-proxies"
              label="Trusted proxies"
              description="local, all, or a comma-separated list of IPs and CIDR ranges."
              value={() => p.state.settings().ipHeaderTrustedProxies}
              onInput={state.textInput("ipHeaderTrustedProxies")}
              configOverridden={state.configOverridden("ipHeaderTrustedProxies")}
              environmentOverridden={state.environmentOverridden("ipHeaderTrustedProxies")}
              disabled={state.disabled("ipHeaderTrustedProxies")}
            />
            <EditableTextField
              id="admin-setting-icon-service"
              label="Icon service"
              description="internal, bitwarden, duckduckgo, google, or a URL template."
              value={() => p.state.settings().iconService}
              onInput={state.textInput("iconService")}
              configOverridden={state.configOverridden("iconService")}
              environmentOverridden={state.environmentOverridden("iconService")}
              disabled={state.disabled("iconService")}
            />
            <EditableTextField
              id="admin-setting-log-level"
              label="Log level"
              description="trace, debug, info, warn, error, or off."
              value={() => p.state.settings().logLevel}
              onInput={state.textInput("logLevel")}
              configOverridden={state.configOverridden("logLevel")}
              environmentOverridden={state.environmentOverridden("logLevel")}
              disabled={state.disabled("logLevel")}
            />
            <EditableNumberField
              id="admin-setting-icon-redirect-code"
              label="Icon redirect code"
              description="Supported redirect codes include 301, 302, 307, and 308."
              value={() => p.state.settings().iconRedirectCode}
              onInput={state.numberInput("iconRedirectCode")}
              configOverridden={state.configOverridden("iconRedirectCode")}
              environmentOverridden={state.environmentOverridden("iconRedirectCode")}
              disabled={state.disabled("iconRedirectCode")}
            />
            <EditableNumberField
              id="admin-setting-icon-cache-ttl"
              label="Icon cache expiry (seconds)"
              description="How long a cached icon remains fresh."
              value={() => p.state.settings().iconCacheTtl}
              onInput={state.numberInput("iconCacheTtl")}
              configOverridden={state.configOverridden("iconCacheTtl")}
              environmentOverridden={state.environmentOverridden("iconCacheTtl")}
              disabled={state.disabled("iconCacheTtl")}
            />
            <EditableNumberField
              id="admin-setting-login-rate-limit"
              label="Login rate limit interval (seconds)"
              description="Average interval between login and two-factor requests from one IP."
              value={() => p.state.settings().loginRatelimitSeconds}
              onInput={state.numberInput("loginRatelimitSeconds")}
              configOverridden={state.configOverridden("loginRatelimitSeconds")}
              environmentOverridden={state.environmentOverridden("loginRatelimitSeconds")}
              disabled={state.disabled("loginRatelimitSeconds")}
            />
            <EditableNumberField
              id="admin-setting-login-rate-burst"
              label="Login rate limit burst"
              description="Maximum short burst allowed before rate limiting."
              value={() => p.state.settings().loginRatelimitMaxBurst}
              onInput={state.numberInput("loginRatelimitMaxBurst")}
              configOverridden={state.configOverridden("loginRatelimitMaxBurst")}
              environmentOverridden={state.environmentOverridden("loginRatelimitMaxBurst")}
              disabled={state.disabled("loginRatelimitMaxBurst")}
            />
            <EditableNumberField
              id="admin-setting-admin-session-lifetime"
              label="Admin session lifetime (minutes)"
              description="Lifetime of administration sessions."
              value={() => p.state.settings().adminSessionLifetime}
              onInput={state.numberInput("adminSessionLifetime")}
              configOverridden={state.configOverridden("adminSessionLifetime")}
              environmentOverridden={state.environmentOverridden("adminSessionLifetime")}
              disabled={state.disabled("adminSessionLifetime")}
            />
            <EditableTextField
              id="admin-setting-allowed-iframe-ancestors"
              label="Allowed iframe ancestors (Know the risks!)"
              description="Domains allowed to embed the web vault in an iframe."
              risk
              riskDescription="Embedding the vault expands the trusted surface; only allow controlled intranet origins."
              value={() => p.state.settings().allowedIframeAncestors}
              onInput={state.textInput("allowedIframeAncestors")}
              configOverridden={state.configOverridden("allowedIframeAncestors")}
              environmentOverridden={state.environmentOverridden("allowedIframeAncestors")}
              disabled={state.disabled("allowedIframeAncestors")}
            />
            <EditableTextField
              id="admin-setting-allowed-connect-src"
              label="Allowed connect-src (Know the risks!)"
              description="Additional HTTPS origins allowed for script requests."
              risk
              riskDescription="Broad origins can expose requests or alias integrations to an unintended service."
              value={() => p.state.settings().allowedConnectSrc}
              onInput={state.textInput("allowedConnectSrc")}
              configOverridden={state.configOverridden("allowedConnectSrc")}
              environmentOverridden={state.environmentOverridden("allowedConnectSrc")}
              disabled={state.disabled("allowedConnectSrc")}
            />
            <EditableCheckboxField
              id="admin-setting-disable-2fa-remember"
              label="Disable remembered two-factor login"
              description="Require a second factor for every login."
              checked={() => p.state.settings().disable2faRemember}
              onChange={state.toggle("disable2faRemember")}
              configOverridden={state.configOverridden("disable2faRemember")}
              environmentOverridden={state.environmentOverridden("disable2faRemember")}
              disabled={state.disabled("disable2faRemember")}
            />
            <EditableCheckboxField
              id="admin-setting-require-device-email"
              label="Require new-device emails"
              description="Require a successful email when a new device logs in."
              checked={() => p.state.settings().requireDeviceEmail}
              onChange={state.toggle("requireDeviceEmail")}
              configOverridden={state.configOverridden("requireDeviceEmail")}
              environmentOverridden={state.environmentOverridden("requireDeviceEmail")}
              disabled={state.disabled("requireDeviceEmail")}
            />
            <EditableCheckboxField
              id="admin-setting-increase-note-size"
              label="Increase note size limit (Know the risks!)"
              description="Raise the secure note limit from 10,000 to 100,000 characters."
              risk
              riskDescription="Larger notes may break client compatibility and exports."
              checked={() => p.state.settings().increaseNoteSizeLimit}
              onChange={state.toggle("increaseNoteSizeLimit")}
              configOverridden={state.configOverridden("increaseNoteSizeLimit")}
              environmentOverridden={state.environmentOverridden("increaseNoteSizeLimit")}
              disabled={state.disabled("increaseNoteSizeLimit")}
            />
            <EditableCheckboxField
              id="admin-setting-reload-templates"
              label="Reload templates (development)"
              description="Reload templates on every request; intended only for development."
              checked={() => p.state.settings().reloadTemplates}
              onChange={state.toggle("reloadTemplates")}
              configOverridden={state.configOverridden("reloadTemplates")}
              environmentOverridden={state.environmentOverridden("reloadTemplates")}
              disabled={state.disabled("reloadTemplates")}
            />
          </div>
        </Details>

        <Details
          title="OpenID Connect SSO settings"
          subtitle="Federated identity and sign-in policy"
          icon={vaultSvgIcons.key}
        >
          <div class="space-y-4 p-4 sm:p-6">
            <EditableCheckboxField
              id="admin-setting-ssoEnabled"
              label="Enabled"
              description="Enable OpenID Connect single sign-on. Dependent fields become available when enabled."
              checked={() => p.state.settings().ssoEnabled}
              onChange={state.toggle("ssoEnabled")}
              configOverridden={state.configOverridden("ssoEnabled")}
              environmentOverridden={state.environmentOverridden("ssoEnabled")}
              disabled={state.disabled("ssoEnabled")}
            />
            <div class="grid gap-4 md:grid-cols-2">
              <EditableCheckboxField
                id="admin-setting-sso-only"
                label="Only SSO login"
                description="Disable email and master-password login."
                checked={() => p.state.settings().ssoOnly}
                onChange={state.toggle("ssoOnly")}
                configOverridden={state.configOverridden("ssoOnly")}
                environmentOverridden={state.environmentOverridden("ssoOnly")}
                disabled={state.disabled("ssoOnly")}
              />
              <EditableCheckboxField
                id="admin-setting-sso-match-email"
                label="Allow email association"
                description="Associate an existing user by email address."
                checked={() => p.state.settings().ssoSignupsMatchEmail}
                onChange={state.toggle("ssoSignupsMatchEmail")}
                configOverridden={state.configOverridden("ssoSignupsMatchEmail")}
                environmentOverridden={state.environmentOverridden("ssoSignupsMatchEmail")}
                disabled={state.disabled("ssoSignupsMatchEmail")}
              />
              <EditableCheckboxField
                id="admin-setting-sso-allow-unknown-email"
                label="Allow unknown email verification status (Know the risks!)"
                description="Permit association when the provider does not verify the email."
                risk
                riskDescription="Combined with email association, this can enable account takeover."
                checked={() => p.state.settings().ssoAllowUnknownEmailVerification}
                onChange={state.toggle("ssoAllowUnknownEmailVerification")}
                configOverridden={state.configOverridden("ssoAllowUnknownEmailVerification")}
                environmentOverridden={state.environmentOverridden("ssoAllowUnknownEmailVerification")}
                disabled={state.disabled("ssoAllowUnknownEmailVerification")}
              />
              <EditableCheckboxField
                id="admin-setting-sso-pkce"
                label="Use PKCE"
                description="Use proof key for the authorization flow."
                checked={() => p.state.settings().ssoPkce}
                onChange={state.toggle("ssoPkce")}
                configOverridden={state.configOverridden("ssoPkce")}
                environmentOverridden={state.environmentOverridden("ssoPkce")}
                disabled={state.disabled("ssoPkce")}
              />
              <EditableTextField
                id="admin-setting-sso-client-id"
                label="Client ID"
                description="OIDC client identifier."
                value={() => p.state.settings().ssoClientId}
                onInput={state.textInput("ssoClientId")}
                configOverridden={state.configOverridden("ssoClientId")}
                environmentOverridden={state.environmentOverridden("ssoClientId")}
                disabled={state.disabled("ssoClientId")}
              />
              <EditableTextField
                id="admin-setting-sso-client-secret"
                label="Client secret"
                description="OIDC client secret."
                value={() => p.state.settings().ssoClientSecret}
                onInput={state.textInput("ssoClientSecret")}
                inputType={() => state.passwordType("ssoClientSecret")}
                passwordKey="ssoClientSecret"
                passwordToggleLabel={() => state.passwordToggleLabel("ssoClientSecret")}
                togglePasswordVisibility={state.togglePasswordVisibility("ssoClientSecret")}
                configOverridden={state.configOverridden("ssoClientSecret")}
                environmentOverridden={state.environmentOverridden("ssoClientSecret")}
                disabled={state.disabled("ssoClientSecret")}
              />
              <EditableTextField
                id="admin-setting-sso-authority"
                label="Authority server"
                description="Base URL of the OIDC provider discovery endpoint."
                value={() => p.state.settings().ssoAuthority}
                onInput={state.textInput("ssoAuthority")}
                configOverridden={state.configOverridden("ssoAuthority")}
                environmentOverridden={state.environmentOverridden("ssoAuthority")}
                disabled={state.disabled("ssoAuthority")}
              />
              <EditableTextField
                id="admin-setting-sso-scopes"
                label="Authorization request scopes"
                description="Space-separated scopes; openid is implicit."
                value={() => p.state.settings().ssoScopes}
                onInput={state.textInput("ssoScopes")}
                configOverridden={state.configOverridden("ssoScopes")}
                environmentOverridden={state.environmentOverridden("ssoScopes")}
                disabled={state.disabled("ssoScopes")}
              />
            </div>
          </div>
        </Details>

        <Details title="SMTP email settings" subtitle="Mail transport configuration" icon={vaultSvgIcons.email}>
          <div class="space-y-4 p-4 sm:p-6">
            <EditableCheckboxField
              id="admin-setting-mailEnabled"
              label="Enabled"
              description="Enable the SMTP transport. Dependent fields become available when enabled."
              checked={() => p.state.settings().mailEnabled}
              onChange={state.toggle("mailEnabled")}
              configOverridden={state.configOverridden("mailEnabled")}
              environmentOverridden={state.environmentOverridden("mailEnabled")}
              disabled={state.disabled("mailEnabled")}
            />
            <div class="grid gap-4 md:grid-cols-2">
              <EditableCheckboxField
                id="admin-setting-use-sendmail"
                label="Use Sendmail"
                description="Send mail through the local sendmail command instead of SMTP."
                checked={() => p.state.settings().useSendmail}
                onChange={state.toggle("useSendmail")}
                configOverridden={state.configOverridden("useSendmail")}
                environmentOverridden={state.environmentOverridden("useSendmail")}
                disabled={state.disabled("useSendmail")}
              />
              <EditableTextField
                id="admin-setting-smtp-host"
                label="Host"
                description="SMTP server hostname."
                value={() => p.state.settings().smtpHost}
                onInput={state.textInput("smtpHost")}
                configOverridden={state.configOverridden("smtpHost")}
                environmentOverridden={state.environmentOverridden("smtpHost")}
                disabled={state.disabled("smtpHost")}
              />
              <EditableTextField
                id="admin-setting-smtp-from"
                label="From address"
                description="Address used as the sender for server mail."
                value={() => p.state.settings().smtpFrom}
                onInput={state.textInput("smtpFrom")}
                configOverridden={state.configOverridden("smtpFrom")}
                environmentOverridden={state.environmentOverridden("smtpFrom")}
                disabled={state.disabled("smtpFrom")}
              />
              <EditableTextField
                id="admin-setting-smtp-from-name"
                label="From name"
                description="Display name used in outgoing mail."
                value={() => p.state.settings().smtpFromName}
                onInput={state.textInput("smtpFromName")}
                configOverridden={state.configOverridden("smtpFromName")}
                environmentOverridden={state.environmentOverridden("smtpFromName")}
                disabled={state.disabled("smtpFromName")}
              />
              <EditableTextField
                id="admin-setting-smtp-username"
                label="Username"
                description="Optional SMTP authentication username."
                value={() => p.state.settings().smtpUsername}
                onInput={state.textInput("smtpUsername")}
                configOverridden={state.configOverridden("smtpUsername")}
                environmentOverridden={state.environmentOverridden("smtpUsername")}
                disabled={state.disabled("smtpUsername")}
              />
              <EditableTextField
                id="admin-setting-smtp-password"
                label="Password"
                description="Optional SMTP authentication password."
                value={() => p.state.settings().smtpPassword}
                onInput={state.textInput("smtpPassword")}
                inputType={() => state.passwordType("smtpPassword")}
                passwordKey="smtpPassword"
                passwordToggleLabel={() => state.passwordToggleLabel("smtpPassword")}
                togglePasswordVisibility={state.togglePasswordVisibility("smtpPassword")}
                configOverridden={state.configOverridden("smtpPassword")}
                environmentOverridden={state.environmentOverridden("smtpPassword")}
                disabled={state.disabled("smtpPassword")}
              />
              <EditableTextField
                id="admin-setting-smtp-auth-mechanism"
                label="Authentication mechanism"
                description="Plain, Login, Xoauth2, or a comma-separated combination."
                value={() => p.state.settings().smtpAuthMechanism}
                onInput={state.textInput("smtpAuthMechanism")}
                configOverridden={state.configOverridden("smtpAuthMechanism")}
                environmentOverridden={state.environmentOverridden("smtpAuthMechanism")}
                disabled={state.disabled("smtpAuthMechanism")}
              />
              <EditableNumberField
                id="admin-setting-smtp-timeout"
                label="Connection timeout (seconds)"
                description="Time to wait before stopping an SMTP connection attempt."
                value={() => p.state.settings().smtpTimeout}
                onInput={state.numberInput("smtpTimeout")}
                configOverridden={state.configOverridden("smtpTimeout")}
                environmentOverridden={state.environmentOverridden("smtpTimeout")}
                disabled={state.disabled("smtpTimeout")}
              />
              <EditableTextField
                id="admin-setting-helo-name"
                label="HELO name"
                description="Server name sent during SMTP HELO."
                value={() => p.state.settings().heloName}
                onInput={state.textInput("heloName")}
                configOverridden={state.configOverridden("heloName")}
                environmentOverridden={state.environmentOverridden("heloName")}
                disabled={state.disabled("heloName")}
              />
              <EditableCheckboxField
                id="admin-setting-smtp-embed-images"
                label="Embed images in email"
                description="Embed server images as email attachments."
                checked={() => p.state.settings().smtpEmbedImages}
                onChange={state.toggle("smtpEmbedImages")}
                configOverridden={state.configOverridden("smtpEmbedImages")}
                environmentOverridden={state.environmentOverridden("smtpEmbedImages")}
                disabled={state.disabled("smtpEmbedImages")}
              />
              <EditableCheckboxField
                id="admin-setting-smtp-invalid-certs"
                label="Accept invalid certificates (Know the risks!)"
                description="Allow SMTP certificates that cannot be validated."
                risk
                riskDescription="This introduces significant man-in-the-middle risk."
                checked={() => p.state.settings().smtpAcceptInvalidCerts}
                onChange={state.toggle("smtpAcceptInvalidCerts")}
                configOverridden={state.configOverridden("smtpAcceptInvalidCerts")}
                environmentOverridden={state.environmentOverridden("smtpAcceptInvalidCerts")}
                disabled={state.disabled("smtpAcceptInvalidCerts")}
              />
              <EditableCheckboxField
                id="admin-setting-smtp-invalid-hostnames"
                label="Accept invalid hostnames (Know the risks!)"
                description="Allow SMTP hostnames that do not match their certificates."
                risk
                riskDescription="This introduces significant man-in-the-middle risk."
                checked={() => p.state.settings().smtpAcceptInvalidHostnames}
                onChange={state.toggle("smtpAcceptInvalidHostnames")}
                configOverridden={state.configOverridden("smtpAcceptInvalidHostnames")}
                environmentOverridden={state.environmentOverridden("smtpAcceptInvalidHostnames")}
                disabled={state.disabled("smtpAcceptInvalidHostnames")}
              />
            </div>
          </div>
        </Details>

        <Details
          title="Email 2FA settings"
          subtitle="Email fallback controls, available when a mail transport is configured"
          icon={vaultSvgIcons.twoFactor}
        >
          <div class="space-y-4 p-4 sm:p-6">
            <p class="text-sm text-slate-600 dark:text-slate-400">
              Email 2FA is derived from SMTP availability. Its controls remain disabled until mail is enabled and a host
              or Sendmail transport is configured.
            </p>
            <div class="grid gap-4 md:grid-cols-2">
              <EditableNumberField
                id="admin-setting-email-token-size"
                label="Email token size"
                description="Number of digits in the email token."
                value={() => p.state.settings().emailTokenSize}
                onInput={state.numberInput("emailTokenSize")}
                configOverridden={state.configOverridden("emailTokenSize")}
                environmentOverridden={state.environmentOverridden("emailTokenSize")}
                disabled={state.disabled("emailTokenSize")}
              />
              <EditableNumberField
                id="admin-setting-email-expiration"
                label="Token expiration (seconds)"
                description="Maximum time for a user to copy the email token."
                value={() => p.state.settings().emailExpirationTime}
                onInput={state.numberInput("emailExpirationTime")}
                configOverridden={state.configOverridden("emailExpirationTime")}
                environmentOverridden={state.environmentOverridden("emailExpirationTime")}
                disabled={state.disabled("emailExpirationTime")}
              />
              <EditableNumberField
                id="admin-setting-email-attempts"
                label="Maximum attempts"
                description="Attempts before a new token must be sent."
                value={() => p.state.settings().emailAttemptsLimit}
                onInput={state.numberInput("emailAttemptsLimit")}
                configOverridden={state.configOverridden("emailAttemptsLimit")}
                environmentOverridden={state.environmentOverridden("emailAttemptsLimit")}
                disabled={state.disabled("emailAttemptsLimit")}
              />
              <EditableCheckboxField
                id="admin-setting-email-enforce-invite"
                label="Setup email 2FA at signup"
                description="Set up email 2FA on verified invitations regardless of organization policy."
                checked={() => p.state.settings().email2faEnforceOnInvite}
                onChange={state.toggle("email2faEnforceOnInvite")}
                configOverridden={state.configOverridden("email2faEnforceOnInvite")}
                environmentOverridden={state.environmentOverridden("email2faEnforceOnInvite")}
                disabled={state.disabled("email2faEnforceOnInvite")}
              />
              <EditableCheckboxField
                id="admin-setting-email-auto-fallback"
                label="Auto-enable 2FA fallback (Know the risks!)"
                description="Automatically set up email 2FA as a fallback provider."
                risk
                riskDescription="A fallback factor changes account recovery behavior; review the threat model first."
                checked={() => p.state.settings().email2faAutoFallback}
                onChange={state.toggle("email2faAutoFallback")}
                configOverridden={state.configOverridden("email2faAutoFallback")}
                environmentOverridden={state.environmentOverridden("email2faAutoFallback")}
                disabled={state.disabled("email2faAutoFallback")}
              />
            </div>
          </div>
        </Details>

        <Details
          title="Additional MFA providers"
          subtitle="Yubikey and Duo credentials with dependency-aware controls"
          icon={vaultSvgIcons.shieldCheck}
        >
          <div class="space-y-6 p-4 sm:p-6">
            <div class="space-y-4">
              <EditableCheckboxField
                id="admin-setting-yubico-enabled"
                label="Enable Yubikey OTP"
                description="Enable Yubikey credentials for users."
                checked={() => p.state.settings().yubicoEnabled}
                onChange={state.toggle("yubicoEnabled")}
                configOverridden={state.configOverridden("yubicoEnabled")}
                environmentOverridden={state.environmentOverridden("yubicoEnabled")}
                disabled={state.disabled("yubicoEnabled")}
              />
              <div class="grid gap-4 md:grid-cols-2">
                <EditableTextField
                  id="admin-setting-yubico-client-id"
                  label="Yubikey client ID"
                  description="Yubico API client identifier."
                  value={() => p.state.settings().yubicoClientId}
                  onInput={state.textInput("yubicoClientId")}
                  configOverridden={state.configOverridden("yubicoClientId")}
                  environmentOverridden={state.environmentOverridden("yubicoClientId")}
                  disabled={state.disabled("yubicoClientId")}
                />
                <EditableTextField
                  id="admin-setting-yubico-secret"
                  label="Yubikey secret key"
                  description="Yubico API secret key."
                  value={() => p.state.settings().yubicoSecretKey}
                  onInput={state.textInput("yubicoSecretKey")}
                  inputType={() => state.passwordType("yubicoSecretKey")}
                  passwordKey="yubicoSecretKey"
                  passwordToggleLabel={() => state.passwordToggleLabel("yubicoSecretKey")}
                  togglePasswordVisibility={state.togglePasswordVisibility("yubicoSecretKey")}
                  configOverridden={state.configOverridden("yubicoSecretKey")}
                  environmentOverridden={state.environmentOverridden("yubicoSecretKey")}
                  disabled={state.disabled("yubicoSecretKey")}
                />
                <EditableTextField
                  id="admin-setting-yubico-server"
                  label="Yubikey server"
                  description="Yubico validation service URL."
                  value={() => p.state.settings().yubicoServer}
                  onInput={state.textInput("yubicoServer")}
                  configOverridden={state.configOverridden("yubicoServer")}
                  environmentOverridden={state.environmentOverridden("yubicoServer")}
                  disabled={state.disabled("yubicoServer")}
                />
              </div>
            </div>
            <div class="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
              <EditableCheckboxField
                id="admin-setting-duo-enabled"
                label="Enable Duo"
                description="Enable global Duo MFA credentials for users."
                checked={() => p.state.settings().duoEnabled}
                onChange={state.toggle("duoEnabled")}
                configOverridden={state.configOverridden("duoEnabled")}
                environmentOverridden={state.environmentOverridden("duoEnabled")}
                disabled={state.disabled("duoEnabled")}
              />
              <div class="grid gap-4 md:grid-cols-2">
                <EditableTextField
                  id="admin-setting-duo-ikey"
                  label="Duo client ID"
                  description="Duo integration key."
                  value={() => p.state.settings().duoIkey}
                  onInput={state.textInput("duoIkey")}
                  configOverridden={state.configOverridden("duoIkey")}
                  environmentOverridden={state.environmentOverridden("duoIkey")}
                  disabled={state.disabled("duoIkey")}
                />
                <EditableTextField
                  id="admin-setting-duo-skey"
                  label="Duo client secret"
                  description="Duo secret key."
                  value={() => p.state.settings().duoSkey}
                  onInput={state.textInput("duoSkey")}
                  inputType={() => state.passwordType("duoSkey")}
                  passwordKey="duoSkey"
                  passwordToggleLabel={() => state.passwordToggleLabel("duoSkey")}
                  togglePasswordVisibility={state.togglePasswordVisibility("duoSkey")}
                  configOverridden={state.configOverridden("duoSkey")}
                  environmentOverridden={state.environmentOverridden("duoSkey")}
                  disabled={state.disabled("duoSkey")}
                />
                <EditableTextField
                  id="admin-setting-duo-host"
                  label="Duo host"
                  description="Duo API hostname."
                  value={() => p.state.settings().duoHost}
                  onInput={state.textInput("duoHost")}
                  configOverridden={state.configOverridden("duoHost")}
                  environmentOverridden={state.environmentOverridden("duoHost")}
                  disabled={state.disabled("duoHost")}
                />
              </div>
            </div>
          </div>
        </Details>

        <Details
          title="Read-only server configuration"
          subtitle="Environment and generated values that require a restart"
          icon={vaultSvgIcons.server}
        >
          <div class="p-4 sm:p-6">
            <p class="mb-4 text-sm text-slate-600 dark:text-slate-400">
              These values are intentionally not editable here. They represent paths, generated values, derived
              transport settings, and server-only switches supplied through the environment.
            </p>
            <div class="grid gap-4 md:grid-cols-2">
              <ReadOnlyField
                id="admin-readonly-data-folder"
                label="Data folder"
                description="Main server data folder."
                value={() => p.state.settings().readOnly.dataFolder}
              />
              <ReadOnlyField
                id="admin-readonly-database-url"
                label="Database URL"
                description="Database connection URL; masked until explicitly shown."
                value={() => p.state.settings().readOnly.databaseUrl}
                inputType={state.passwordType("databaseUrl")}
                passwordKey="databaseUrl"
                passwordToggleLabel={() => state.passwordToggleLabel("databaseUrl")}
                togglePasswordVisibility={state.togglePasswordVisibility("databaseUrl")}
              />
              <ReadOnlyField
                id="admin-readonly-web-vault-folder"
                label="Web vault folder"
                description="Static web vault directory."
                value={() => p.state.settings().readOnly.webVaultFolder}
              />
              <ReadOnlyField
                id="admin-readonly-domain-origin"
                label="Domain origin"
                description="Generated origin derived from Domain URL."
                value={() => p.state.settings().readOnly.domainOrigin}
              />
              <ReadOnlyField
                id="admin-readonly-domain-path"
                label="Domain path"
                description="Generated path derived from Domain URL."
                value={() => p.state.settings().readOnly.domainPath}
              />
              <ReadOnlyField
                id="admin-readonly-icon-service-url"
                label="Generated icon service URL"
                description="Resolved URL used by the icon service."
                value={() => p.state.settings().readOnly.iconServiceUrl}
              />
              <ReadOnlyField
                id="admin-readonly-sso-callback-path"
                label="SSO callback path"
                description="Generated callback URL derived from Domain URL."
                value={() => p.state.settings().readOnly.ssoCallbackPath}
              />
              <ReadOnlyField
                id="admin-readonly-smtp-security"
                label="Secure SMTP"
                description="Derived transport mode: starttls, force_tls, or off."
                value={() => p.state.settings().readOnly.smtpSecurity}
              />
              <ReadOnlyField
                id="admin-readonly-smtp-port"
                label="SMTP port"
                description="Auto-derived from Secure SMTP."
                value={() => p.state.settings().readOnly.smtpPort}
                inputType="number"
              />
              <ReadOnlyField
                id="admin-readonly-smtp-image-source"
                label="Generated SMTP image source"
                description="Derived from image embedding and Domain URL."
                value={() => p.state.settings().readOnly.smtpImageSource}
              />
              <ReadOnlyCheckboxField
                id="admin-readonly-websocket"
                label="Enable websocket notifications"
                description="Environment-controlled websocket support."
                checked={() => p.state.settings().readOnly.enableWebsocket}
              />
              <ReadOnlyCheckboxField
                id="admin-readonly-email-2fa"
                label="Email 2FA available"
                description="Derived from mail transport availability."
                checked={() => p.state.settings().readOnly.email2faEnabled}
              />
              <ReadOnlyCheckboxField
                id="admin-readonly-admin-security"
                label="Admin page security bypass"
                description="Environment-controlled security bypass; disabled by default."
                checked={() => p.state.settings().readOnly.adminPageSecurityBypass}
              />
              <ReadOnlyField
                id="admin-readonly-session-lifetime"
                label="Session lifetime (minutes)"
                description="Environment-controlled user session lifetime."
                value={() => p.state.settings().readOnly.sessionLifetimeMinutes}
                inputType="number"
              />
              <ReadOnlyField
                id="admin-readonly-job-poll-interval"
                label="Job scheduler poll interval (ms)"
                description="Environment-controlled scheduler interval."
                value={() => p.state.settings().readOnly.jobPollIntervalMs}
                inputType="number"
              />
              <ReadOnlyField
                id="admin-readonly-send-purge-schedule"
                label="Send purge schedule"
                description="Environment-controlled scheduled job."
                value={() => p.state.settings().readOnly.sendPurgeSchedule}
              />
            </div>
          </div>
        </Details>

        <div class="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="outlineRed" size="sm" class="h-8 text-sm" onClick={state.reset}>
            <Icon path={vaultSvgIcons.restore} class="mr-1.5 size-3.5" />
            Reset overrides
          </Button>
          <Button type="submit" variant="filledBlue" size="sm" class="h-8 text-sm" disabled={!p.state.settingsDirty()}>
            <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
            Save configuration
          </Button>
        </div>
        <p class="text-right text-sm text-slate-500 dark:text-slate-400">Pressing Enter will not submit this form.</p>
      </form>
      <Details
        class="mt-4"
        title="Mail and database tools"
        subtitle="Test outbound mail delivery or create a database snapshot"
        icon={vaultSvgIcons.server}
      >
        <div class="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
          <AdminMailTestCard onNotifySuccess={state.notifySuccess} onNotifyError={state.notifyError} />
          <AdminBackupCard onNotifySuccess={state.notifySuccess} onNotifyError={state.notifyError} />
        </div>
      </Details>
    </section>
  )
}
