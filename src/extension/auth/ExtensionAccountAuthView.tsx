import { type JSX, Show } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import type { ExtensionFullWindowCommands } from "../fullwindow/ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowEnvironmentSettings } from "../fullwindow/ExtensionFullWindowEnvironmentSettings.js"
import { extensionAccountAuthViewStateCreate } from "./extensionAccountAuthViewStateCreate.js"

export function ExtensionAccountAuthView(p: {
  commands: ExtensionFullWindowCommands
  environment: () => ExtensionFullWindowEnvironmentSettings
  onLogin: (email: string) => void
  onSettings: () => void
  idPrefix?: string
}): JSX.Element {
  const state = extensionAccountAuthViewStateCreate({
    commands: () => p.commands,
    environment: p.environment,
    onLogin: p.onLogin,
    onSettings: p.onSettings,
  })

  return (
    <CardWrapper class="mx-auto flex w-full max-w-lg flex-col gap-4 p-5">
      <header class="flex flex-col gap-1">
        <h2 class="text-lg font-semibold">Account access</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Create or finish setting up an account on the selected server.
        </p>
      </header>
      <nav aria-label="Account setup" class="flex flex-wrap gap-1">
        <Button
          variant={state.isRegister() ? "filledBlue" : "outline"}
          size="sm"
          aria-current={state.isRegister() ? "step" : undefined}
          onClick={state.registerOpen}
        >
          Create account
        </Button>
        <Button
          variant={state.isVerify() ? "filledBlue" : "outline"}
          size="sm"
          aria-current={state.isVerify() ? "step" : undefined}
          onClick={state.verifyOpen}
        >
          Verify email
        </Button>
        <Button
          variant={state.isPasswordSetup() ? "filledBlue" : "outline"}
          size="sm"
          aria-current={state.isPasswordSetup() ? "step" : undefined}
          onClick={state.passwordSetupOpen}
        >
          Set up password
        </Button>
      </nav>

      <div class="flex flex-col gap-1">
        <Label for={`${p.idPrefix ?? ""}account-email`}>Email address</Label>
        <InputS
          id={`${p.idPrefix ?? ""}account-email`}
          type="email"
          autocomplete="email"
          valueSignal={state.emailSignal}
          disabled={state.busy()}
        />
      </div>

      <Show when={state.isRegister()}>
        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}account-name`}>Name (optional)</Label>
          <InputS
            id={`${p.idPrefix ?? ""}account-name`}
            autocomplete="name"
            valueSignal={state.nameSignal}
            disabled={state.busy()}
          />
        </div>
      </Show>

      <Show when={state.isRegister() || state.isPasswordSetup()}>
        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}account-password`}>Master password</Label>
          <InputS
            id={`${p.idPrefix ?? ""}account-password`}
            type="password"
            autocomplete="new-password"
            valueSignal={state.passwordSignal}
            disabled={state.busy()}
          />
        </div>
        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}account-password-confirm`}>Confirm master password</Label>
          <InputS
            id={`${p.idPrefix ?? ""}account-password-confirm`}
            type="password"
            autocomplete="new-password"
            valueSignal={state.passwordConfirmSignal}
            disabled={state.busy()}
          />
        </div>
        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}account-password-hint`}>Master password hint (optional)</Label>
          <InputS
            id={`${p.idPrefix ?? ""}account-password-hint`}
            valueSignal={state.passwordHintSignal}
            disabled={state.busy()}
          />
        </div>
      </Show>

      <Show when={state.isPasswordSetup()}>
        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}account-access-token`}>Setup access token</Label>
          <InputS
            id={`${p.idPrefix ?? ""}account-access-token`}
            type="password"
            autocomplete="off"
            valueSignal={state.accessTokenSignal}
            disabled={state.busy()}
          />
          <p class="text-xs text-slate-600 dark:text-slate-300">
            Use only the short-lived token supplied by your identity login.
          </p>
        </div>
      </Show>

      <Show when={state.isVerify()}>
        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}account-user-id`}>User ID</Label>
          <InputS
            id={`${p.idPrefix ?? ""}account-user-id`}
            autocomplete="off"
            valueSignal={state.userIdSignal}
            disabled={state.busy()}
          />
        </div>
        <div class="flex flex-col gap-1">
          <Label for={`${p.idPrefix ?? ""}account-token`}>Verification token</Label>
          <InputS
            id={`${p.idPrefix ?? ""}account-token`}
            type="password"
            autocomplete="off"
            valueSignal={state.tokenSignal}
            disabled={state.busy()}
          />
        </div>
      </Show>

      <Show when={state.busy()}>
        <div role="status" aria-label="Processing account request" class="flex items-center gap-2 text-sm">
          <LoaderShuffle4Dots /> Processing…
        </div>
      </Show>
      <Show when={state.errorMessage()}>
        {(message) => (
          <div role="alert" class="flex flex-col gap-2 text-sm text-red-600 dark:text-red-400">
            <p>{message()}</p>
            <Button variant="outline" size="sm" disabled={state.busy()} onClick={state.retry}>
              Retry
            </Button>
          </div>
        )}
      </Show>
      <Show when={state.successMessage()}>
        {(message) => (
          <p role="status" aria-live="polite" class="text-sm text-green-700 dark:text-green-400">
            {message()}
          </p>
        )}
      </Show>

      <div class="flex flex-wrap gap-2">
        <Show when={state.isRegister()}>
          <Button variant="filledBlue" disabled={state.busy()} onClick={() => void state.accountRegister()}>
            Create account
          </Button>
        </Show>
        <Show when={state.isVerify()}>
          <Button variant="filledBlue" disabled={state.busy()} onClick={() => void state.accountVerify()}>
            Verify email
          </Button>
          <Button variant="outline" disabled={state.busy()} onClick={() => void state.verificationEmailSend()}>
            Send verification email
          </Button>
        </Show>
        <Show when={state.isPasswordSetup()}>
          <Button variant="filledBlue" disabled={state.busy()} onClick={() => void state.accountPasswordSetup()}>
            Set master password
          </Button>
        </Show>
        <Button variant="ghost" disabled={state.busy()} onClick={state.loginContinue}>
          Continue to login
        </Button>
        <Button variant="ghost" disabled={state.busy()} onClick={state.settingsOpen}>
          Server settings
        </Button>
      </div>
    </CardWrapper>
  )
}
