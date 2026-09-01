import { type JSX, Match, Show, Switch } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { ExtensionFullWindowCommands } from "../fullwindow/ExtensionFullWindowCommands.js"
import type { ExtensionLoginChallenge } from "./extensionLoginChallengeSchema.js"
import { extensionLoginChallengeViewStateCreate } from "./extensionLoginChallengeViewStateCreate.js"
import { extensionLoginTwoFactorProvider } from "./extensionLoginTwoFactorProvider.js"

export function ExtensionLoginChallengeView(p: {
  challenge: () => ExtensionLoginChallenge
  commands: ExtensionFullWindowCommands
  busy: () => boolean
  errorMessage: () => string | null
  statusMessage: () => string | null
  idPrefix?: string
}): JSX.Element {
  const state = extensionLoginChallengeViewStateCreate({
    challenge: p.challenge,
    commands: () => p.commands,
    busy: p.busy,
  })
  return (
    <CardWrapper class="flex w-full max-w-md flex-col gap-4 p-5">
      <div>
        <h2 class="font-semibold text-lg">Two-step verification</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">Choose an available method to continue.</p>
      </div>
      <Show when={p.errorMessage()}>
        {(message) => (
          <p role="alert" class="text-sm text-red-600 dark:text-red-400">
            {message()}
          </p>
        )}
      </Show>
      <Show when={p.statusMessage()}>
        {(message) => (
          <p role="status" class="text-sm text-blue-700 dark:text-blue-300">
            {message()}
          </p>
        )}
      </Show>
      <div class="flex flex-col gap-1">
        <Label for={`${p.idPrefix ?? ""}login-challenge-method`}>Verification method</Label>
        <SelectSingleNative
          id={`${p.idPrefix ?? ""}login-challenge-method`}
          valueSignal={state.providerSelectSignal}
          getOptions={state.providerKeys}
          valueText={state.providerLabel}
          disabled={p.busy()}
        />
      </div>
      <form class="flex flex-col gap-4" onSubmit={state.submit}>
        <Switch>
          <Match when={state.selectedProvider() === extensionLoginTwoFactorProvider.authenticator}>
            <InputS
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              aria-label="Authenticator code"
              placeholder="123456"
              valueSignal={state.tokenInputSignal}
            />
          </Match>
          <Match when={state.selectedProvider() === extensionLoginTwoFactorProvider.email}>
            <div class="flex flex-col gap-2">
              <p class="text-sm">
                {p.challenge().emailHint === null
                  ? "Send a code to your account email."
                  : `Send a code to ${p.challenge().emailHint}.`}
              </p>
              <Button type="button" variant="outline" disabled={p.busy()} onClick={state.emailSend}>
                Send email code
              </Button>
              <InputS
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                aria-label="Email verification code"
                placeholder="Verification code"
                valueSignal={state.tokenInputSignal}
              />
            </div>
          </Match>
          <Match when={state.selectedProvider() === extensionLoginTwoFactorProvider.webauthn}>
            <div class="flex flex-col gap-2">
              <Button type="button" variant="outline" disabled={p.busy()} onClick={state.webAuthnPrompt}>
                Use security key or passkey
              </Button>
              <Show when={state.webAuthnStatus()}>
                {(message) => (
                  <p role="status" class="text-sm">
                    {message()}
                  </p>
                )}
              </Show>
            </div>
          </Match>
          <Match when={state.selectedProvider() === extensionLoginTwoFactorProvider.recoveryCode}>
            <InputS
              type="text"
              autocomplete="one-time-code"
              aria-label="Recovery code"
              placeholder="Recovery code"
              valueSignal={state.tokenInputSignal}
            />
          </Match>
        </Switch>
        <Checkbox
          id={`${p.idPrefix ?? ""}login-challenge-remember`}
          checked={state.rememberDevice()}
          disabled={p.busy()}
          onChange={state.rememberDeviceSet}
        >
          <span class="text-sm">Remember this device</span>
        </Checkbox>
        <div class="flex flex-wrap gap-2">
          <Button type="submit" variant="filledBlue" disabled={p.busy()}>
            {p.errorMessage() === null ? "Verify" : "Retry verification"}
          </Button>
          <Button type="button" variant="outline" disabled={p.busy()} onClick={state.cancel}>
            Cancel
          </Button>
        </div>
      </form>
    </CardWrapper>
  )
}
