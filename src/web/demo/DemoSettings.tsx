import { For, type JSX, Match, Show, Switch } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ThemeButton } from "#ui/interactive/theme/ThemeButton.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { CodeBlock } from "#ui/static/code/CodeBlock.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { demoSettingsStateCreate } from "./demoSettingsStateCreate.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

type DemoSettingsState = ReturnType<typeof demoSettingsStateCreate>

export function DemoSettings(): JSX.Element {
  const state = demoSettingsStateCreate()

  return (
    <main
      class={`min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 ${
        state.compactMode.get() ? "text-sm" : ""
      }`}
    >
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <a href="/demo/vault" class="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
              ← Back to Demo Vault
            </a>
            <h1 class="mt-3 font-bold text-2xl tracking-tight sm:text-3xl">Account &amp; Security Settings</h1>
            <p class="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Explore account preferences safely. Every action stays in this browser and no API requests are made.
            </p>
          </div>
          <Badge variant="subtle" class="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            Interactive demo
          </Badge>
        </header>

        <Show when={state.feedback()}>
          {(feedback) => (
            <div
              role={feedback().tone === "error" ? "alert" : "status"}
              class={`mb-6 rounded-lg border p-3 text-sm ${
                feedback().tone === "error"
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}
            >
              {feedback().message}
            </div>
          )}
        </Show>

        <nav aria-label="Settings sections" class="mb-5 overflow-x-auto md:hidden">
          <ul class="flex min-w-max list-none gap-2 pb-2">
            <For each={state.navigation}>
              {(item) => (
                <li>
                  <Button
                    size="sm"
                    variant={state.currentSection() === item.id ? "filled" : "outline"}
                    aria-current={state.currentSection() === item.id ? "page" : undefined}
                    onClick={() => state.sectionSelect(item.id)}
                  >
                    <Icon path={item.icon} class="mr-1.5 size-4" />
                    {item.label}
                  </Button>
                </li>
              )}
            </For>
            <li>
              <Button size="sm" variant="outline" onClick={() => state.sectionSelect("security")}>
                <Icon path={vaultSvgIcons.twoFactor} class="mr-1.5 size-4" />
                Two-Step Login Setup
              </Button>
            </li>
          </ul>
        </nav>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-4">
          <nav aria-label="Settings sections" class="hidden md:block">
            <div class="sticky top-6">
              <ul class="list-none space-y-1">
                <For each={state.navigation}>
                  {(item) => (
                    <li>
                      <Button
                        variant="ghost"
                        class={`h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left ${
                          state.currentSection() === item.id
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                        aria-current={state.currentSection() === item.id ? "page" : undefined}
                        onClick={() => state.sectionSelect(item.id)}
                      >
                        <Icon path={item.icon} class="size-4 shrink-0" />
                        <span>
                          <span class="block font-semibold text-sm">{item.label}</span>
                          <span
                            class={`block text-xs ${
                              state.currentSection() === item.id
                                ? "text-blue-700 dark:text-blue-200"
                                : "text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            {item.description}
                          </span>
                        </span>
                      </Button>
                    </li>
                  )}
                </For>
              </ul>
              <div class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Button
                  size="sm"
                  variant="outline"
                  class="w-full justify-start text-blue-700 dark:text-blue-400"
                  onClick={() => state.sectionSelect("security")}
                >
                  <Icon path={vaultSvgIcons.twoFactor} class="mr-2 size-4" />
                  Two-Step Login Setup
                </Button>
              </div>
            </div>
          </nav>

          <div class="min-w-0 md:col-span-3">
            <Switch>
              <Match when={state.currentSection() === "profile"}>
                <ProfileSection state={state} />
              </Match>
              <Match when={state.currentSection() === "security"}>
                <SecuritySection state={state} />
              </Match>
              <Match when={state.currentSection() === "email"}>
                <EmailSection state={state} />
              </Match>
              <Match when={state.currentSection() === "devices"}>
                <DevicesSection state={state} />
              </Match>
              <Match when={state.currentSection() === "emergency"}>
                <EmergencySection state={state} />
              </Match>
              <Match when={state.currentSection() === "tools"}>
                <ToolsSection state={state} />
              </Match>
              <Match when={state.currentSection() === "appearance"}>
                <AppearanceSection state={state} />
              </Match>
              <Match when={state.currentSection() === "danger"}>
                <DangerSection state={state} />
              </Match>
            </Switch>
          </div>
        </div>
      </div>
    </main>
  )
}

function ProfileSection(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <div class="space-y-6">
      <SectionTitle title="Profile" description="Manage your account identity and API credentials." />
      <CardWrapper class="p-5 sm:p-6">
        <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div
            role="img"
            aria-label="Profile avatar"
            class="flex size-11 items-center justify-center rounded-full text-white"
            style={{ "background-color": props.state.avatarColor.get() }}
          >
            <Icon path={vaultSvgIcons.personalVault} class="size-6" />
          </div>
          <div>
            <h2 class="font-semibold">My Profile</h2>
            <Show
              when={props.state.emailVerified()}
              fallback={
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="subtle" class="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    Email unverified
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={props.state.verificationEmailSent()}
                    onClick={props.state.verificationEmailSend}
                  >
                    {props.state.verificationEmailSent() ? "Verification Email Sent" : "Verify Email"}
                  </Button>
                </div>
              }
            >
              <Badge
                variant="subtle"
                class="mt-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              >
                Email verified
              </Badge>
            </Show>
          </div>
        </div>
        <form class="mt-5 max-w-lg space-y-4" onSubmit={props.state.profileSave}>
          <Field label="Email Address" for="demo-profile-email">
            <Input id="demo-profile-email" type="email" value={props.state.currentEmail()} disabled />
          </Field>
          <Field label="Display Name" for="demo-profile-name">
            <Input
              id="demo-profile-name"
              value={props.state.name.get()}
              onInput={(event) => props.state.name.set(event.currentTarget.value)}
            />
          </Field>
          <Field label="Avatar Accent Color" for="demo-profile-color">
            <div class="flex items-center gap-3">
              <input
                id="demo-profile-color"
                type="color"
                value={props.state.avatarColor.get()}
                onInput={(event) => props.state.avatarColor.set(event.currentTarget.value)}
                class="h-10 w-16 cursor-pointer rounded border border-slate-300 bg-transparent p-1 dark:border-slate-700"
              />
              <span class="font-mono text-sm">{props.state.avatarColor.get()}</span>
            </div>
          </Field>
          <Button type="submit" variant="filled" size="sm">
            <Icon path={vaultSvgIcons.save} class="mr-1.5 size-4" /> Save Profile
          </Button>
        </form>
      </CardWrapper>
      <CardWrapper class="p-5 sm:p-6">
        <h2 class="font-semibold">API Key</h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Credentials for compatible CLI and SDK clients.</p>
        <Button variant="outline" size="sm" class="mt-4" onClick={props.state.apiKeyOpen}>
          View API Key
        </Button>
        <Show when={props.state.apiKeyPanelOpen()}>
          <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold text-sm">Account API Credentials</h3>
              <Button size="sm" variant="ghost" onClick={props.state.apiKeyClose}>
                Close
              </Button>
            </div>
            <Show when={props.state.apiKeyError()}>
              {(error) => (
                <p role="alert" class="mt-3 text-red-700 text-sm dark:text-red-300">
                  {error()}
                </p>
              )}
            </Show>
            <Show
              when={props.state.apiKeyVisible()}
              fallback={
                <div class="mt-3 space-y-3">
                  <p class="text-sm text-slate-600 dark:text-slate-300">
                    Enter your master password to decrypt and view your account API key.
                  </p>
                  <div class="flex max-w-md flex-col gap-2 sm:flex-row">
                    <Input
                      type="password"
                      aria-label="Master password for API key"
                      placeholder="Master password"
                      value={props.state.apiKeyPassword.get()}
                      onInput={(event) => props.state.apiKeyPassword.set(event.currentTarget.value)}
                    />
                    <Button size="sm" variant="filled" class="shrink-0" onClick={props.state.apiKeyReveal}>
                      Reveal Key
                    </Button>
                  </div>
                </div>
              }
            >
              <div class="mt-3 space-y-3">
                <div>
                  <Label class="block text-sm text-slate-600 dark:text-slate-300">client_id</Label>
                  <p class="mt-0.5 break-all font-mono text-sm">user.{props.state.profile.id}</p>
                </div>
                <div>
                  <Label class="block text-sm text-slate-600 dark:text-slate-300">client_secret (API Key)</Label>
                  <div class="mt-1">
                    <CodeBlock data={props.state.profile.apiKey} />
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={props.state.apiKeyRotate}>
                  Rotate API Key
                </Button>
              </div>
            </Show>
          </div>
        </Show>
      </CardWrapper>
    </div>
  )
}

function SecuritySection(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <div class="space-y-6">
      <SectionTitle title="Security & KDF" description="Review password, encryption key, and session controls." />
      <CardWrapper class="p-5 sm:p-6">
        <h2 class="font-semibold">Two-Step Login</h2>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Set up a local demo authenticator. No account or authenticator app is changed.
        </p>
        <Show
          when={!props.state.twoFactorEnabled()}
          fallback={
            <div class="mt-4 space-y-3">
              <Badge variant="subtle" class="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Authenticator enabled for this demo
              </Badge>
              <div>
                <Label class="block text-sm font-medium">Demo recovery codes</Label>
                <div class="mt-1">
                  <CodeBlock data={props.state.twoFactorRecoveryCodes.join("\n")} />
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={props.state.twoFactorReset}>
                Reset Demo Setup
              </Button>
            </div>
          }
        >
          <form class="mt-4 max-w-lg space-y-4" onSubmit={props.state.twoFactorConfirm}>
            <div>
              <Label class="block text-sm font-medium">Authenticator setup secret</Label>
              <div class="mt-1">
                <CodeBlock data={props.state.twoFactorSecret} />
              </div>
            </div>
            <Field label="Authenticator Code" for="demo-two-factor-code">
              <Input
                id="demo-two-factor-code"
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="Enter 246810"
                value={props.state.twoFactorCode.get()}
                onInput={(event) => props.state.twoFactorCode.set(event.currentTarget.value)}
                required
              />
            </Field>
            <Button type="submit" variant="filled" size="sm">
              Confirm Authenticator
            </Button>
          </form>
        </Show>
      </CardWrapper>
      <CardWrapper class="p-5 sm:p-6">
        <h2 class="font-semibold">Change Master Password</h2>
        <form class="mt-4 max-w-lg space-y-4" onSubmit={props.state.passwordChange}>
          <Field label="Current Master Password" for="demo-current-password">
            <Input id="demo-current-password" name="currentPassword" type="password" required />
          </Field>
          <Field label="New Master Password" for="demo-new-password">
            <Input id="demo-new-password" name="newPassword" type="password" minlength={8} required />
          </Field>
          <Field label="Confirm New Master Password" for="demo-confirm-password">
            <Input id="demo-confirm-password" name="confirmPassword" type="password" minlength={8} required />
          </Field>
          <Field label="Master Password Hint" for="demo-password-hint">
            <Input
              id="demo-password-hint"
              value={props.state.passwordHint.get()}
              onInput={(event) => props.state.passwordHint.set(event.currentTarget.value)}
            />
          </Field>
          <Button type="submit" variant="filled" size="sm">
            Change Master Password
          </Button>
        </form>
      </CardWrapper>
      <CardWrapper class="p-5 sm:p-6">
        <h2 class="font-semibold">Key Derivation Function (KDF)</h2>
        <form class="mt-4 max-w-lg space-y-4" onSubmit={props.state.kdfSave}>
          <fieldset>
            <legend class="mb-2 text-sm font-medium">KDF Algorithm</legend>
            <div class="flex flex-wrap gap-4">
              <For each={["PBKDF2 SHA-256", "Argon2id"] as const}>
                {(algorithm) => (
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="demo-kdf"
                      checked={props.state.kdfAlgorithm.get() === algorithm}
                      onChange={() => props.state.kdfAlgorithm.set(algorithm)}
                    />
                    {algorithm}
                  </label>
                )}
              </For>
            </div>
          </fieldset>
          <Field label="Iterations" for="demo-kdf-iterations">
            <Input
              id="demo-kdf-iterations"
              type="number"
              min="1"
              value={props.state.kdfIterations.get()}
              onInput={(event) => props.state.kdfIterations.set(event.currentTarget.value)}
            />
          </Field>
          <Show when={props.state.kdfAlgorithm.get() === "Argon2id"}>
            <div class="grid grid-cols-2 gap-3">
              <Field label="Memory (MB)" for="demo-kdf-memory">
                <Input
                  id="demo-kdf-memory"
                  type="number"
                  min="1"
                  value={props.state.kdfMemory.get()}
                  onInput={(event) => props.state.kdfMemory.set(event.currentTarget.value)}
                />
              </Field>
              <Field label="Parallelism" for="demo-kdf-parallelism">
                <Input
                  id="demo-kdf-parallelism"
                  type="number"
                  min="1"
                  value={props.state.kdfParallelism.get()}
                  onInput={(event) => props.state.kdfParallelism.set(event.currentTarget.value)}
                />
              </Field>
            </div>
          </Show>
          <Field label="Master Password (required to save changes)" for="demo-kdf-password">
            <Input
              id="demo-kdf-password"
              type="password"
              value={props.state.kdfMasterPassword.get()}
              onInput={(event) => props.state.kdfMasterPassword.set(event.currentTarget.value)}
              required
            />
          </Field>
          <Button type="submit" variant="filled" size="sm">
            Save KDF Settings
          </Button>
        </form>
      </CardWrapper>
      <div class="grid gap-4 sm:grid-cols-2">
        <CardWrapper class="p-5">
          <h2 class="font-semibold">Rotate Encryption Keys</h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Generate a new account encryption key and keypair.
          </p>
          <Button size="sm" variant="outline" class="mt-4" onClick={props.state.rotateOpen}>
            Rotate Demo Keys
          </Button>
          <Show when={props.state.rotateConfirmationOpen()}>
            <div class="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <h3 class="font-semibold text-sm text-amber-900 dark:text-amber-200">Confirm Key Rotation</h3>
              <Input
                type="password"
                aria-label="Master password for key rotation"
                placeholder="Master password"
                value={props.state.rotateMasterPassword.get()}
                onInput={(event) => props.state.rotateMasterPassword.set(event.currentTarget.value)}
              />
              <div class="flex gap-2">
                <Button size="sm" variant="filled" onClick={props.state.keysRotate}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={props.state.rotateClose}>
                  Cancel
                </Button>
              </div>
            </div>
          </Show>
        </CardWrapper>
        <CardWrapper class="p-5">
          <h2 class="font-semibold">Deauthorize Sessions</h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Invalidate all sessions except this demo browser.
          </p>
          <Button size="sm" variant="outline" class="mt-4 text-red-600" onClick={props.state.deauthorizeOpen}>
            Deauthorize Others
          </Button>
          <DeauthorizeConfirmation state={props.state} />
        </CardWrapper>
      </div>
    </div>
  )
}

function EmailSection(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <div class="space-y-6">
      <SectionTitle title="Email Address" description="Update the verified email associated with your account." />
      <CardWrapper class="p-5 sm:p-6">
        <h2 class="font-semibold">Change Account Email</h2>
        <p class="mt-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          Current email: <strong>{props.state.currentEmail()}</strong>
        </p>
        <Show
          when={props.state.emailStep() === 1}
          fallback={
            <form class="mt-5 max-w-lg space-y-4" onSubmit={props.state.emailChange}>
              <p class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                A demo code was sent to <strong>{props.state.newEmail.get()}</strong>. Use <strong>123456</strong>.
              </p>
              <Field label="Verification Code" for="demo-email-code">
                <Input
                  id="demo-email-code"
                  inputmode="numeric"
                  value={props.state.emailCode.get()}
                  onInput={(event) => props.state.emailCode.set(event.currentTarget.value)}
                />
              </Field>
              <Field label="Confirm Master Password" for="demo-email-confirm-password">
                <Input
                  id="demo-email-confirm-password"
                  type="password"
                  value={props.state.emailConfirmMasterPassword.get()}
                  onInput={(event) => props.state.emailConfirmMasterPassword.set(event.currentTarget.value)}
                  required
                />
              </Field>
              <div class="flex gap-2">
                <Button type="submit" variant="filled" size="sm">
                  Confirm Email Change
                </Button>
                <Button size="sm" variant="ghost" onClick={props.state.emailReset}>
                  Back
                </Button>
              </div>
            </form>
          }
        >
          <form class="mt-5 max-w-lg space-y-4" onSubmit={props.state.emailCodeSend}>
            <Field label="New Email Address" for="demo-new-email">
              <Input
                id="demo-new-email"
                type="email"
                value={props.state.newEmail.get()}
                onInput={(event) => props.state.newEmail.set(event.currentTarget.value)}
                required
              />
            </Field>
            <Field label="Current Master Password" for="demo-email-password">
              <Input id="demo-email-password" type="password" required />
            </Field>
            <Button type="submit" variant="filled" size="sm">
              Send Verification Code
            </Button>
          </form>
        </Show>
      </CardWrapper>
    </div>
  )
}

function DevicesSection(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <div class="space-y-6">
      <SectionTitle title="Devices" description="Review clients currently authorized to access your vault." />
      <CardWrapper class="p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2 class="font-semibold">Authorized Devices &amp; Sessions</h2>
          <div class="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => props.state.notify("Demo device list refreshed locally.")}
            >
              Refresh
            </Button>
            <Button size="sm" variant="outline" class="text-red-600" onClick={props.state.deauthorizeOpen}>
              Deauthorize All
            </Button>
          </div>
        </div>
        <DeauthorizeConfirmation state={props.state} />
        <div class="divide-y divide-slate-200 dark:divide-slate-800">
          <For each={props.state.devices()}>
            {(device) => (
              <div class="flex flex-wrap items-center justify-between gap-3 py-4">
                <div class="flex items-center gap-3">
                  <Icon path={vaultSvgIcons.server} class="size-5 text-slate-500" />
                  <div>
                    <div class="flex flex-wrap items-center gap-2 font-medium">
                      {device.name}
                      <Show when={device.current}>
                        <Badge variant="subtle">Current device</Badge>
                      </Show>
                    </div>
                    <p class="text-sm text-slate-500">{device.detail}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={device.current}
                  onClick={() => props.state.deviceRemove(device.id)}
                >
                  Deauthorize
                </Button>
              </div>
            )}
          </For>
        </div>
      </CardWrapper>
    </div>
  )
}

function EmergencySection(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <div class="space-y-6">
      <SectionTitle
        title="Emergency Access"
        description="Manage trusted people who can request access to your vault."
      />
      <CardWrapper class="p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-semibold">Invite Trusted Contact</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => props.state.notify("Demo emergency access refreshed locally.")}
          >
            Refresh
          </Button>
        </div>
        <form class="mt-4 grid max-w-2xl gap-3 sm:grid-cols-3" onSubmit={props.state.contactInvite}>
          <Field label="Contact Email Address" for="demo-contact-email">
            <Input
              id="demo-contact-email"
              type="email"
              placeholder="trusted.person@example.com"
              value={props.state.contactEmail.get()}
              onInput={(event) => props.state.contactEmail.set(event.currentTarget.value)}
              required
            />
          </Field>
          <Field label="Access Type" for="demo-contact-access">
            <select
              id="demo-contact-access"
              value={props.state.contactAccess.get()}
              onChange={(event) => props.state.contactAccess.set(event.currentTarget.value as "View" | "Takeover")}
              class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="View">View (Read Only)</option>
              <option value="Takeover">Takeover (Full Account)</option>
            </select>
          </Field>
          <Field label="Wait Time" for="demo-contact-wait">
            <select
              id="demo-contact-wait"
              value={props.state.contactWaitDays.get()}
              onChange={(event) => props.state.contactWaitDays.set(Number(event.currentTarget.value))}
              class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <For each={[0, 1, 2, 3, 7, 14]}>
                {(days) => (
                  <option value={days}>{days === 0 ? "Immediately" : `${days} day${days === 1 ? "" : "s"}`}</option>
                )}
              </For>
            </select>
          </Field>
          <Button type="submit" variant="filled" class="sm:col-span-3 sm:justify-self-start">
            Invite Contact
          </Button>
        </form>
        <h3 class="mt-6 border-b border-slate-200 pb-2 font-semibold text-sm uppercase tracking-wide dark:border-slate-800">
          Trusted Contacts ({props.state.contacts().length})
        </h3>
        <ul class="list-none divide-y divide-slate-200 dark:divide-slate-800">
          <For each={props.state.contacts()}>
            {(contact) => (
              <li class="py-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="font-medium">{contact.name}</p>
                    <p class="text-sm text-slate-600 dark:text-slate-300">
                      {contact.email} · {contact.access} access · {contact.waitDays} day wait · {contact.status}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Show when={contact.status === "Invited"}>
                      <Button size="sm" variant="outline" onClick={() => props.state.contactReinvite(contact.id)}>
                        Re-invite
                      </Button>
                    </Show>
                    <Show when={contact.status === "Accepted"}>
                      <Button size="sm" variant="filled" onClick={() => props.state.contactConfirm(contact.id)}>
                        Confirm
                      </Button>
                    </Show>
                    <Show when={contact.status === "Recovery Initiated"}>
                      <Button size="sm" variant="filled" onClick={() => props.state.contactRecoveryApprove(contact.id)}>
                        Approve Access
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        class="text-red-600"
                        onClick={() => props.state.contactRecoveryReject(contact.id)}
                      >
                        Reject Access
                      </Button>
                    </Show>
                    <Button size="sm" variant="outline" onClick={() => props.state.contactEditOpen(contact.id)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      class="text-red-600"
                      onClick={() => props.state.contactRemove(contact.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <Show when={props.state.contactEditingId() === contact.id}>
                  <form
                    class="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:grid-cols-2"
                    onSubmit={props.state.contactEditSave}
                  >
                    <Field label="Access Type" for={`demo-edit-access-${contact.id}`}>
                      <select
                        id={`demo-edit-access-${contact.id}`}
                        value={props.state.contactEditAccess.get()}
                        onChange={(event) =>
                          props.state.contactEditAccess.set(event.currentTarget.value as "View" | "Takeover")
                        }
                        class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="View">View (Read Only)</option>
                        <option value="Takeover">Takeover (Full Account)</option>
                      </select>
                    </Field>
                    <Field label="Wait Time" for={`demo-edit-wait-${contact.id}`}>
                      <select
                        id={`demo-edit-wait-${contact.id}`}
                        value={props.state.contactEditWaitDays.get()}
                        onChange={(event) => props.state.contactEditWaitDays.set(Number(event.currentTarget.value))}
                        class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <For each={[0, 1, 2, 3, 7, 14]}>
                          {(days) => (
                            <option value={days}>
                              {days === 0 ? "Immediately" : `${days} day${days === 1 ? "" : "s"}`}
                            </option>
                          )}
                        </For>
                      </select>
                    </Field>
                    <div class="flex gap-2 sm:col-span-2">
                      <Button type="submit" size="sm" variant="filled">
                        Save Changes
                      </Button>
                      <Button size="sm" variant="ghost" onClick={props.state.contactEditCancel}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Show>
              </li>
            )}
          </For>
        </ul>
        <div class="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
          <h3 class="border-b border-slate-200 pb-2 font-semibold text-sm dark:border-slate-700">
            Vaults Granted to Me
          </h3>
          <div class="divide-y divide-slate-200 dark:divide-slate-700">
            <For each={props.state.emergencyVaults()}>
              {(vault) => (
                <div class="flex flex-wrap items-center justify-between gap-3 py-3">
                  <p class="text-sm text-slate-600 dark:text-slate-400">
                    <strong class="text-slate-900 dark:text-slate-100">{vault.email}</strong> · {vault.access} access ·{" "}
                    {vault.waitDays} day wait · {vault.status}
                  </p>
                  <Show when={vault.status === "Invited"}>
                    <Button size="sm" variant="outline" onClick={() => props.state.emergencyVaultAccept(vault.id)}>
                      Accept
                    </Button>
                  </Show>
                  <Show when={vault.status === "Confirmed"}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => props.state.notify(`Demo access request initiated for ${vault.email}.`)}
                    >
                      Initiate Access
                    </Button>
                  </Show>
                  <Show when={vault.status === "Recovery Approved" && vault.access === "View"}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => props.state.notify(`Viewing demo items shared by ${vault.email}.`)}
                    >
                      View Items
                    </Button>
                  </Show>
                  <Show when={vault.status === "Recovery Approved" && vault.access === "Takeover"}>
                    <Button
                      size="sm"
                      variant="outline"
                      class="text-red-600"
                      onClick={() => props.state.notify(`Demo takeover started for ${vault.email}.`)}
                    >
                      Take Over
                    </Button>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      </CardWrapper>
    </div>
  )
}

function ToolsSection(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <div class="space-y-6">
      <SectionTitle title="Tools" description="Import a backup or export a portable copy of your vault." />
      <div class="grid gap-6 lg:grid-cols-2">
        <CardWrapper class="p-5 sm:p-6">
          <h2 class="font-semibold">Import Vault</h2>
          <form class="mt-4 space-y-4" onSubmit={props.state.importSubmit}>
            <ChoiceButtons
              label="File Format"
              options={["Bitwarden JSON", "Bitwarden CSV"]}
              value={props.state.importFormat.get()}
              onSelect={(value) => props.state.importFormat.set(value as "Bitwarden JSON" | "Bitwarden CSV")}
            />
            <Field label="Vault File" for="demo-import-file">
              <input
                id="demo-import-file"
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={props.state.importFileSelect}
                class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium dark:file:bg-slate-800"
              />
            </Field>
            <Field label="Master Password (when vault is locked)" for="demo-import-password">
              <Input
                id="demo-import-password"
                type="password"
                value={props.state.importMasterPassword.get()}
                onInput={(event) => props.state.importMasterPassword.set(event.currentTarget.value)}
              />
            </Field>
            <Field label="Or Paste Vault Data" for="demo-import-data">
              <Textarea
                id="demo-import-data"
                rows={5}
                placeholder="Paste demo JSON or CSV content here…"
                value={props.state.importContent.get()}
                onInput={(event) => props.state.importContent.set(event.currentTarget.value)}
              />
            </Field>
            <Button type="submit" variant="filled" size="sm">
              Import Vault
            </Button>
          </form>
        </CardWrapper>
        <CardWrapper class="p-5 sm:p-6">
          <h2 class="font-semibold">Export Vault</h2>
          <form class="mt-4 space-y-4" onSubmit={props.state.exportSubmit}>
            <ChoiceButtons
              label="Export Format"
              options={["Decrypted JSON", "Decrypted CSV", "Encrypted JSON"]}
              value={props.state.exportFormat.get()}
              onSelect={(value) =>
                props.state.exportFormat.set(value as "Decrypted JSON" | "Decrypted CSV" | "Encrypted JSON")
              }
            />
            <Show when={props.state.exportFormat.get() !== "Encrypted JSON"}>
              <div class="space-y-4">
                <Field label="Master Password (when vault is locked)" for="demo-export-password">
                  <Input
                    id="demo-export-password"
                    type="password"
                    value={props.state.exportMasterPassword.get()}
                    onInput={(event) => props.state.exportMasterPassword.set(event.currentTarget.value)}
                  />
                </Field>
                <p class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  Decrypted exports contain plaintext credentials. This demo does not generate a real file.
                </p>
              </div>
            </Show>
            <div class="flex flex-wrap gap-2">
              <Button type="submit" variant="filled" size="sm">
                Export Vault
              </Button>
              <Show when={props.state.exportData()}>
                <Button type="button" variant="outline" size="sm" onClick={props.state.exportCopy}>
                  Copy to Clipboard
                </Button>
              </Show>
            </div>
          </form>
        </CardWrapper>
      </div>
    </div>
  )
}

function AppearanceSection(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <div class="space-y-6">
      <SectionTitle title="Appearance" description="Choose how OneWarden looks and feels on this device." />
      <CardWrapper class="p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div>
            <h2 class="font-semibold">Theme</h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Cycle between system, light, and dark themes.</p>
          </div>
          <ThemeButton showText class="border border-slate-200 dark:border-slate-700" />
        </div>
        <div class="mt-5 space-y-5">
          <Checkbox
            id="demo-compact-mode"
            checked={props.state.compactMode.get()}
            onChange={props.state.compactMode.set}
          >
            <span class="font-medium">Compact display</span>
            <span class="block text-sm text-slate-600 dark:text-slate-300">Use denser text across this demo page.</span>
          </Checkbox>
          <Checkbox
            id="demo-reduce-motion"
            checked={props.state.reduceMotion.get()}
            onChange={props.state.reduceMotion.set}
          >
            <span class="font-medium">Reduce motion</span>
            <span class="block text-sm text-slate-600 dark:text-slate-300">
              Prefer fewer decorative transitions in this demo.
            </span>
          </Checkbox>
        </div>
      </CardWrapper>
    </div>
  )
}

function DangerSection(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <div class="space-y-6">
      <SectionTitle
        title="Danger Zone"
        description="Preview irreversible account actions without changing real data."
      />
      <CardWrapper class="border-red-200 p-5 dark:border-red-900 sm:p-6">
        <h2 class="font-semibold text-red-700 dark:text-red-300">Delete Account</h2>
        <p class="mt-2 text-sm text-slate-600 dark:text-slate-400">
          A real deletion removes all vault items and account settings. This demo only clears the confirmation field.
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" class="text-red-600" onClick={props.state.deleteOpen}>
            Delete Account
          </Button>
          <Button variant="ghost" size="sm" onClick={props.state.recoveryDeletionToggle}>
            {props.state.recoveryDeletionOpen() ? "Hide Recovery Option" : "Request Deletion by Email"}
          </Button>
        </div>
        <Show when={props.state.deleteConfirmationOpen()}>
          <form
            class="mt-5 max-w-lg space-y-4 rounded-lg bg-red-50 p-4 dark:bg-red-950/30"
            onSubmit={props.state.deleteSimulate}
          >
            <h3 class="font-semibold text-red-900 dark:text-red-200">Confirm Account Deletion</h3>
            <Field label={'Type "delete my account"'} for="demo-delete-confirmation">
              <Input
                id="demo-delete-confirmation"
                value={props.state.deleteConfirmation.get()}
                onInput={(event) => props.state.deleteConfirmation.set(event.currentTarget.value)}
                required
              />
            </Field>
            <Field label="Master Password" for="demo-delete-password">
              <Input
                id="demo-delete-password"
                type="password"
                value={props.state.deleteMasterPassword.get()}
                onInput={(event) => props.state.deleteMasterPassword.set(event.currentTarget.value)}
                required
              />
            </Field>
            <Field label="Two-Factor OTP Code (Optional)" for="demo-delete-otp">
              <Input
                id="demo-delete-otp"
                inputmode="numeric"
                value={props.state.deleteOtp.get()}
                onInput={(event) => props.state.deleteOtp.set(event.currentTarget.value)}
              />
            </Field>
            <div class="flex flex-wrap gap-2">
              <Button type="submit" variant="filled" class="bg-red-600 text-white hover:bg-red-700">
                Permanently Delete Account
              </Button>
              <Button type="button" variant="ghost" onClick={props.state.deleteClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Show>
        <Show when={props.state.recoveryDeletionOpen()}>
          <form
            class="mt-5 max-w-lg space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
            onSubmit={props.state.recoveryDeletionSend}
          >
            <h3 class="font-semibold text-sm">Request Deletion Email</h3>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              If you lost your master password, request an email with a deletion confirmation link.
            </p>
            <Field label="Account Email" for="demo-recovery-email">
              <Input
                id="demo-recovery-email"
                type="email"
                value={props.state.recoveryEmail.get()}
                onInput={(event) => props.state.recoveryEmail.set(event.currentTarget.value)}
                required
              />
            </Field>
            <Button type="submit" variant="filled" size="sm">
              Send Deletion Link
            </Button>
          </form>
        </Show>
      </CardWrapper>
    </div>
  )
}

function SectionTitle(props: { title: string; description: string }): JSX.Element {
  return (
    <div>
      <h2 class="font-bold text-xl tracking-tight">{props.title}</h2>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{props.description}</p>
    </div>
  )
}

function Field(props: { label: string; for: string; children: JSX.Element }): JSX.Element {
  return (
    <div>
      <Label for={props.for} class="mb-1 block text-sm font-medium">
        {props.label}
      </Label>
      {props.children}
    </div>
  )
}

function DeauthorizeConfirmation(props: { state: DemoSettingsState }): JSX.Element {
  return (
    <Show when={props.state.deauthorizeConfirmationOpen()}>
      <div class="mt-4 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
        <h3 class="font-semibold text-sm text-red-900 dark:text-red-200">Confirm Deauthorization</h3>
        <p class="text-sm text-red-800 dark:text-red-300">
          Enter your master password to revoke all other demo sessions.
        </p>
        <Input
          type="password"
          aria-label="Master password for session deauthorization"
          placeholder="Master password"
          value={props.state.deauthorizeMasterPassword.get()}
          onInput={(event) => props.state.deauthorizeMasterPassword.set(event.currentTarget.value)}
        />
        <div class="flex gap-2">
          <Button
            size="sm"
            variant="filled"
            class="bg-red-600 text-white hover:bg-red-700"
            onClick={props.state.devicesRemoveOthers}
          >
            Confirm Deauthorize
          </Button>
          <Button size="sm" variant="ghost" onClick={props.state.deauthorizeClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Show>
  )
}

function ChoiceButtons(props: {
  label: string
  options: string[]
  value: string
  onSelect: (value: string) => void
}): JSX.Element {
  return (
    <fieldset>
      <legend class="mb-2 text-sm font-medium">{props.label}</legend>
      <div class="flex flex-wrap gap-2">
        <For each={props.options}>
          {(option) => (
            <Button
              size="sm"
              variant={props.value === option ? "filled" : "outline"}
              aria-pressed={props.value === option}
              onClick={() => props.onSelect(option)}
            >
              {option}
            </Button>
          )}
        </For>
      </div>
    </fieldset>
  )
}
