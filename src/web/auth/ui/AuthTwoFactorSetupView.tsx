import { For, type JSX, Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { AuthErrorFeedback } from "./AuthErrorFeedback.jsx"
import {
  type AuthTwoFactorSetupViewProps,
  authTwoFactorSetupViewStateCreate,
} from "./authTwoFactorSetupViewStateCreate.js"

export function AuthTwoFactorSetupView(props: AuthTwoFactorSetupViewProps): JSX.Element {
  const state = authTwoFactorSetupViewStateCreate(props)

  return (
    <div class="mx-auto max-w-4xl px-4 py-8">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-sm"
              onClick={state.back}
              aria-label="Back to Vault"
            >
              <Icon path={vaultSvgIcons.arrowLeft} class="mr-1 size-3.5" />
              Back to Vault
            </Button>
            <h1 class="font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">Two-Step Login</h1>
          </div>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Two-step login protects your account by requiring an extra verification method when you log in.
          </p>
        </div>
      </div>

      <Show when={state.errorMessage()}>{(msg) => <AuthErrorFeedback message={msg} class="mb-6 p-4" />}</Show>

      <Show when={state.successMessage()}>
        {(msg) => (
          <div
            role="status"
            class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {msg()}
          </div>
        )}
      </Show>

      <div class="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <Label for="setup-master-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Master Password (required for enabling, disabling, or viewing security keys)
        </Label>
        <div class="mt-1 flex max-w-md items-center gap-2">
          <Input
            id="setup-master-password"
            type="password"
            placeholder="Enter master password"
            value={state.masterPasswordPrompt()}
            onInput={(e) => state.setMasterPasswordPrompt(e.currentTarget.value)}
            class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Main Providers List */}
      <div class="space-y-4">
        {/* Authenticator App */}
        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between p-5">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Icon path={vaultSvgIcons.cellphone} class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Authenticator App</h2>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Use an authenticator app (e.g. Aegis, Authy, Google Authenticator) to get verification codes.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 pt-2 sm:pt-0">
              <span
                class={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  state.authenticatorEnabled()
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {state.authenticatorEnabled() ? "Enabled" : "Disabled"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 text-sm font-medium"
                onClick={() =>
                  state.activeSection() === "authenticator" ? state.closeSection() : state.openSection("authenticator")
                }
              >
                <Icon
                  path={state.activeSection() === "authenticator" ? vaultSvgIcons.close : vaultSvgIcons.cog}
                  class="mr-1.5 size-3.5"
                />
                {state.activeSection() === "authenticator"
                  ? "Close"
                  : state.authenticatorEnabled()
                    ? "Manage"
                    : "Set Up"}
              </Button>
            </div>
          </div>

          <Show when={state.activeSection() === "authenticator"}>
            <div class="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <Show
                when={!state.authenticatorEnabled()}
                fallback={
                  <div class="space-y-4">
                    <p class="text-sm text-slate-700 dark:text-slate-300">
                      Authenticator app two-factor authentication is active on this account.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                      disabled={state.isActionLoading()}
                      onClick={state.handleDisableAuthenticator}
                    >
                      <Icon path={vaultSvgIcons.shieldAlert} class="mr-1.5 size-3.5" />
                      Disable Authenticator App
                    </Button>
                  </div>
                }
              >
                <div class="max-w-md space-y-4">
                  <p class="text-sm text-slate-700 dark:text-slate-300">
                    Scan or enter the following secret key into your authenticator application:
                  </p>
                  <div class="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <Label class="text-sm font-medium text-slate-500">Key (Base32)</Label>
                    <div class="font-mono text-sm font-bold tracking-wider text-slate-900 dark:text-slate-100">
                      {state.authenticatorKey() || "Loading key..."}
                    </div>
                  </div>

                  <div>
                    <Label
                      for="setup-authenticator-token"
                      class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Enter 6-Digit Code to Verify
                    </Label>
                    <Input
                      id="setup-authenticator-token"
                      type="text"
                      inputmode="numeric"
                      placeholder="123456"
                      value={state.authenticatorToken()}
                      onInput={(e) => state.setAuthenticatorToken(e.currentTarget.value)}
                      class="mt-1 h-9 w-full rounded-md border-slate-200 bg-white px-3 font-mono text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="filledBlue"
                    size="sm"
                    class="h-8 text-sm font-medium"
                    disabled={state.isActionLoading()}
                    onClick={state.handleActivateAuthenticator}
                  >
                    <Icon path={vaultSvgIcons.shieldCheck} class="mr-1.5 size-3.5" />
                    Enable Authenticator
                  </Button>
                </div>
              </Show>
            </div>
          </Show>
        </CardWrapper>

        {/* Email Verification */}
        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between p-5">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Icon path={vaultSvgIcons.email} class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Email</h2>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Receive a security verification code sent to your email address during login.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 pt-2 sm:pt-0">
              <span
                class={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  state.emailEnabled()
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {state.emailEnabled() ? "Enabled" : "Disabled"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 text-sm font-medium"
                onClick={() => (state.activeSection() === "email" ? state.closeSection() : state.openSection("email"))}
              >
                <Icon
                  path={state.activeSection() === "email" ? vaultSvgIcons.close : vaultSvgIcons.cog}
                  class="mr-1.5 size-3.5"
                />
                {state.activeSection() === "email" ? "Close" : state.emailEnabled() ? "Manage" : "Set Up"}
              </Button>
            </div>
          </div>

          <Show when={state.activeSection() === "email"}>
            <div class="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <Show
                when={!state.emailEnabled()}
                fallback={
                  <div class="space-y-4">
                    <p class="text-sm text-slate-700 dark:text-slate-300">
                      Email two-factor authentication is active for{" "}
                      <span class="font-medium">{state.emailAddress()}</span>.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                      disabled={state.isActionLoading()}
                      onClick={state.handleDisableEmail}
                    >
                      <Icon path={vaultSvgIcons.shieldAlert} class="mr-1.5 size-3.5" />
                      Disable Email 2FA
                    </Button>
                  </div>
                }
              >
                <div class="max-w-md space-y-4">
                  <div>
                    <Label
                      for="setup-email-address"
                      class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Email Address
                    </Label>
                    <div class="mt-1 flex gap-2">
                      <Input
                        id="setup-email-address"
                        type="email"
                        value={state.emailAddress()}
                        onInput={(e) => state.setEmailAddress(e.currentTarget.value)}
                        class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="h-8 shrink-0 text-sm"
                        disabled={state.isActionLoading()}
                        onClick={state.handleSendEmailVerification}
                      >
                        <Icon path={vaultSvgIcons.email} class="mr-1.5 size-3.5" />
                        Send Code
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label for="setup-email-token" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Verification Code
                    </Label>
                    <Input
                      id="setup-email-token"
                      type="text"
                      placeholder="Enter verification code"
                      value={state.emailToken()}
                      onInput={(e) => state.setEmailToken(e.currentTarget.value)}
                      class="mt-1 h-9 w-full rounded-md border-slate-200 bg-white px-3 font-mono text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="filledBlue"
                    size="sm"
                    class="h-8 text-sm font-medium"
                    disabled={state.isActionLoading()}
                    onClick={state.handleActivateEmail}
                  >
                    <Icon path={vaultSvgIcons.shieldCheck} class="mr-1.5 size-3.5" />
                    Enable Email 2FA
                  </Button>
                </div>
              </Show>
            </div>
          </Show>
        </CardWrapper>

        {/* FIDO2 / WebAuthn Security Key */}
        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between p-5">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Icon path={vaultSvgIcons.key} class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">FIDO2 / WebAuthn Security Key</h2>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Use hardware security keys (YubiKey, Titan, etc.) or biometric passkeys.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 pt-2 sm:pt-0">
              <span
                class={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  state.webAuthnEnabled()
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {state.webAuthnEnabled() ? `${state.webAuthnKeys().length} Key(s)` : "Disabled"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 text-sm font-medium"
                onClick={() =>
                  state.activeSection() === "webauthn" ? state.closeSection() : state.openSection("webauthn")
                }
              >
                <Icon
                  path={state.activeSection() === "webauthn" ? vaultSvgIcons.close : vaultSvgIcons.key}
                  class="mr-1.5 size-3.5"
                />
                {state.activeSection() === "webauthn" ? "Close" : "Manage Keys"}
              </Button>
            </div>
          </div>

          <Show when={state.activeSection() === "webauthn"}>
            <div class="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <div class="space-y-4">
                <Show when={state.webAuthnKeys().length > 0}>
                  <div class="space-y-2">
                    <h3 class="font-medium text-sm text-slate-800 dark:text-slate-200">Registered Security Keys</h3>
                    <div class="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
                      <For each={state.webAuthnKeys()}>
                        {(key) => (
                          <div class="flex items-center justify-between p-3 text-sm">
                            <span class="font-medium text-slate-800 dark:text-slate-200">{key.name}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400"
                              onClick={() => state.handleDeleteWebAuthnKey(key.id)}
                            >
                              <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                <div class="max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h3 class="font-medium text-sm text-slate-800 dark:text-slate-200">Add New Security Key</h3>
                  <div>
                    <Label
                      for="setup-webauthn-name"
                      class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Key Name
                    </Label>
                    <Input
                      id="setup-webauthn-name"
                      type="text"
                      placeholder="e.g. YubiKey 5 NFC"
                      value={state.webAuthnKeyName()}
                      onInput={(e) => state.setWebAuthnKeyName(e.currentTarget.value)}
                      class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm font-medium"
                      onClick={state.handleWebAuthnRegisterPrompt}
                    >
                      <Icon path={vaultSvgIcons.key} class="mr-1.5 size-3.5" />
                      Prompt Security Key
                    </Button>
                    <Button
                      type="button"
                      variant="filledBlue"
                      size="sm"
                      class="h-8 text-sm font-medium"
                      disabled={state.isActionLoading()}
                      onClick={state.handleActivateWebAuthn}
                    >
                      <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
                      Save Security Key
                    </Button>
                  </div>

                  <Show when={state.webAuthnStatus()}>
                    {(status) => <p class="text-sm text-blue-600 dark:text-blue-400">{status()}</p>}
                  </Show>
                </div>

                <Show when={state.webAuthnEnabled()}>
                  <div class="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400"
                      disabled={state.isActionLoading()}
                      onClick={state.handleDisableWebAuthnAll}
                    >
                      <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                      Disable All Security Keys
                    </Button>
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </CardWrapper>

        {/* Duo Security */}
        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between p-5">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Icon path={vaultSvgIcons.twoFactor} class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Duo Security</h2>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Use Duo Mobile push notifications and security tokens.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 pt-2 sm:pt-0">
              <span
                class={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  state.duoEnabled()
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {state.duoEnabled() ? "Enabled" : "Disabled"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 text-sm font-medium"
                onClick={() => (state.activeSection() === "duo" ? state.closeSection() : state.openSection("duo"))}
              >
                <Icon
                  path={state.activeSection() === "duo" ? vaultSvgIcons.close : vaultSvgIcons.cog}
                  class="mr-1.5 size-3.5"
                />
                {state.activeSection() === "duo" ? "Close" : state.duoEnabled() ? "Manage" : "Set Up"}
              </Button>
            </div>
          </div>

          <Show when={state.activeSection() === "duo"}>
            <div class="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <Show
                when={!state.duoEnabled()}
                fallback={
                  <div class="space-y-4">
                    <p class="text-sm text-slate-700 dark:text-slate-300">
                      Duo Security two-factor authentication is active on this account.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400"
                      disabled={state.isActionLoading()}
                      onClick={state.handleDisableDuo}
                    >
                      <Icon path={vaultSvgIcons.shieldAlert} class="mr-1.5 size-3.5" />
                      Disable Duo Security
                    </Button>
                  </div>
                }
              >
                <div class="max-w-md space-y-3">
                  <div>
                    <Label for="setup-duo-host" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Integration Host
                    </Label>
                    <Input
                      id="setup-duo-host"
                      type="text"
                      placeholder="api-xxxx.duosecurity.com"
                      value={state.duoHost()}
                      onInput={(e) => state.setDuoHost(e.currentTarget.value)}
                      class="mt-1 h-9 w-full rounded-md border-slate-200 bg-white px-3 font-mono text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <Label
                      for="setup-duo-client-id"
                      class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Integration Key (Client ID)
                    </Label>
                    <Input
                      id="setup-duo-client-id"
                      type="text"
                      value={state.duoClientId()}
                      onInput={(e) => state.setDuoClientId(e.currentTarget.value)}
                      class="mt-1 h-9 w-full rounded-md border-slate-200 bg-white px-3 font-mono text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <Label
                      for="setup-duo-client-secret"
                      class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Secret Key (Client Secret)
                    </Label>
                    <Input
                      id="setup-duo-client-secret"
                      type="password"
                      value={state.duoClientSecret()}
                      onInput={(e) => state.setDuoClientSecret(e.currentTarget.value)}
                      class="mt-1 h-9 w-full rounded-md border-slate-200 bg-white px-3 font-mono text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="filledBlue"
                    size="sm"
                    class="h-8 text-sm font-medium"
                    disabled={state.isActionLoading()}
                    onClick={state.handleActivateDuo}
                  >
                    <Icon path={vaultSvgIcons.shieldCheck} class="mr-1.5 size-3.5" />
                    Enable Duo Security
                  </Button>
                </div>
              </Show>
            </div>
          </Show>
        </CardWrapper>

        {/* YubiKey OTP */}
        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between p-5">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Icon path={vaultSvgIcons.usbKey} class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">YubiKey OTP</h2>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Use Yubico OTP touch tokens generated by your hardware YubiKey.
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 pt-2 sm:pt-0">
              <span
                class={`rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  state.yubikeyEnabled()
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {state.yubikeyEnabled() ? "Enabled" : "Disabled"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 text-sm font-medium"
                onClick={() =>
                  state.activeSection() === "yubikey" ? state.closeSection() : state.openSection("yubikey")
                }
              >
                <Icon
                  path={state.activeSection() === "yubikey" ? vaultSvgIcons.close : vaultSvgIcons.cog}
                  class="mr-1.5 size-3.5"
                />
                {state.activeSection() === "yubikey" ? "Close" : state.yubikeyEnabled() ? "Manage" : "Set Up"}
              </Button>
            </div>
          </div>

          <Show when={state.activeSection() === "yubikey"}>
            <div class="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <Show
                when={!state.yubikeyEnabled()}
                fallback={
                  <div class="space-y-4">
                    <p class="text-sm text-slate-700 dark:text-slate-300">
                      YubiKey OTP two-factor authentication is active on this account.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400"
                      disabled={state.isActionLoading()}
                      onClick={state.handleDisableYubikey}
                    >
                      <Icon path={vaultSvgIcons.shieldAlert} class="mr-1.5 size-3.5" />
                      Disable YubiKey OTP
                    </Button>
                  </div>
                }
              >
                <div class="max-w-md space-y-3">
                  <div>
                    <Label for="setup-yubikey-1" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Key 1 (Touch your YubiKey)
                    </Label>
                    <Input
                      id="setup-yubikey-1"
                      type="password"
                      placeholder="Insert key & touch gold contact"
                      value={state.yubikeyKey1()}
                      onInput={(e) => state.setYubikeyKey1(e.currentTarget.value)}
                      class="mt-1 h-9 w-full rounded-md border-slate-200 bg-white px-3 font-mono text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <Label for="setup-yubikey-2" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Key 2 (Optional backup YubiKey)
                    </Label>
                    <Input
                      id="setup-yubikey-2"
                      type="password"
                      placeholder="Insert backup key & touch"
                      value={state.yubikeyKey2()}
                      onInput={(e) => state.setYubikeyKey2(e.currentTarget.value)}
                      class="mt-1 h-9 w-full rounded-md border-slate-200 bg-white px-3 font-mono text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div class="pt-1">
                    <Checkbox id="setup-yubikey-nfc" checked={state.yubikeyNfc()} onChange={state.setYubikeyNfc}>
                      <span class="select-none text-sm text-slate-600 dark:text-slate-400">
                        Enable NFC / Mobile support
                      </span>
                    </Checkbox>
                  </div>

                  <Button
                    type="button"
                    variant="filledBlue"
                    size="sm"
                    class="h-8 text-sm font-medium"
                    disabled={state.isActionLoading()}
                    onClick={state.handleActivateYubikey}
                  >
                    <Icon path={vaultSvgIcons.shieldCheck} class="mr-1.5 size-3.5" />
                    Enable YubiKey OTP
                  </Button>
                </div>
              </Show>
            </div>
          </Show>
        </CardWrapper>

        {/* Recovery Code */}
        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between p-5">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Icon path={vaultSvgIcons.shieldAlert} class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Recovery Code</h2>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Use an emergency recovery code to access your vault if you lose access to your two-step devices.
                </p>
              </div>
            </div>
            <div class="pt-2 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 text-sm font-medium"
                onClick={() =>
                  state.activeSection() === "recovery" ? state.closeSection() : state.openSection("recovery")
                }
              >
                <Icon
                  path={state.activeSection() === "recovery" ? vaultSvgIcons.close : vaultSvgIcons.key}
                  class="mr-1.5 size-3.5"
                />
                {state.activeSection() === "recovery" ? "Close" : "View Recovery Code"}
              </Button>
            </div>
          </div>

          <Show when={state.activeSection() === "recovery"}>
            <div class="border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <Show
                when={state.recoveryCode()}
                fallback={
                  <div class="max-w-md space-y-3">
                    <p class="text-sm text-slate-700 dark:text-slate-300">
                      Enter your Master Password at the top of this page to view or regenerate your emergency recovery
                      code.
                    </p>
                    <Button
                      type="button"
                      variant="filledBlue"
                      size="sm"
                      class="h-8 text-sm font-medium"
                      disabled={state.isActionLoading()}
                      onClick={state.handleGetRecoveryCode}
                    >
                      <Icon path={vaultSvgIcons.key} class="mr-1.5 size-3.5" />
                      Retrieve Recovery Code
                    </Button>
                  </div>
                }
              >
                {(code) => (
                  <div class="max-w-lg space-y-4">
                    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
                      <h3 class="font-semibold text-sm text-amber-900 dark:text-amber-200">
                        Save Your Emergency Recovery Code
                      </h3>
                      <p class="mt-1 text-sm text-amber-800 dark:text-amber-300">
                        Write down or store this code in a secure physical location. If you lose your two-step devices,
                        this is the only way to recover access.
                      </p>
                      <div class="mt-3 flex items-center justify-between rounded-md border border-amber-300 bg-white p-3 font-mono text-base font-bold tracking-widest text-slate-900 dark:border-amber-800 dark:bg-slate-900 dark:text-slate-50">
                        <span>{code()}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          class="h-8 text-sm font-medium"
                          onClick={state.handleCopyRecoveryCode}
                        >
                          <Icon
                            path={state.recoveryCopied() ? vaultSvgIcons.check : vaultSvgIcons.copy}
                            class="mr-1.5 size-3.5"
                          />
                          <Show when={state.recoveryCopied()} fallback="Copy">
                            Copied!
                          </Show>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Show>
            </div>
          </Show>
        </CardWrapper>

        {/* Remembered Devices */}
        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between p-5">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Icon path={vaultSvgIcons.shieldCheck} class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Remembered Devices</h2>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Manage devices that skip the two-step verification prompt for 30 days.
                </p>
              </div>
            </div>
            <div class="pt-2 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400"
                onClick={state.handleClearRememberedDevices}
              >
                <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                Clear Remembered Devices
              </Button>
            </div>
          </div>
        </CardWrapper>
      </div>
    </div>
  )
}
