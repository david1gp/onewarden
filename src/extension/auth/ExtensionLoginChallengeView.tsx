import { type JSX, Match, Show, Switch } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { ExtensionFullWindowCommands } from "../fullwindow/ExtensionFullWindowCommands.js"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionCheckbox } from "../ui/ExtensionCheckbox.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { ExtensionSelectSingleNative } from "../ui/ExtensionSelectSingleNative.jsx"
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
    <ExtensionCardWrapper class="flex w-full max-w-md flex-col gap-4 p-5">
      <div>
        <h2 class="font-semibold text-lg">Two-step verification</h2>
        <p class="extension-muted-text text-sm">Choose an available method to continue.</p>
      </div>
      <Show when={p.errorMessage()}>
        {(message) => (
          <p role="alert" class="extension-error-text text-sm">
            {message()}
          </p>
        )}
      </Show>
      <Show when={p.statusMessage()}>
        {(message) => (
          <p role="status" class="extension-info-text text-sm">
            {message()}
          </p>
        )}
      </Show>
      <div class="flex flex-col gap-1">
        <Label for={`${p.idPrefix ?? ""}login-challenge-method`}>Verification method</Label>
        <ExtensionSelectSingleNative
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
            <ExtensionInputS
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              aria-label="Authenticator code"
              placeholder="123456"
              disabled={p.busy()}
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
              <ExtensionInputS
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                aria-label="Email verification code"
                placeholder="Verification code"
                disabled={p.busy()}
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
            <ExtensionInputS
              type="text"
              autocomplete="one-time-code"
              aria-label="Recovery code"
              placeholder="Recovery code"
              disabled={p.busy()}
              valueSignal={state.tokenInputSignal}
            />
          </Match>
        </Switch>
        <ExtensionCheckbox
          id={`${p.idPrefix ?? ""}login-challenge-remember`}
          checked={state.rememberDevice()}
          disabled={p.busy()}
          onChange={state.rememberDeviceSet}
        >
          <span class="text-sm">Remember this device</span>
        </ExtensionCheckbox>
        <div class="flex flex-wrap gap-2">
          <Button type="submit" variant="filledBlue" class="extension-primary-control" disabled={p.busy()}>
            {p.errorMessage() === null ? "Verify" : "Retry verification"}
          </Button>
          <Button type="button" variant="outline" disabled={p.busy()} onClick={state.cancel}>
            Cancel
          </Button>
        </div>
      </form>
    </ExtensionCardWrapper>
  )
}
