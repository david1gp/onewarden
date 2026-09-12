import { type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { CheckSingle } from "#ui/input/check/CheckSingle.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { ExtensionBadge } from "../ui/ExtensionBadge.jsx"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { ExtensionSeparator } from "../ui/ExtensionSeparator.jsx"
import { extensionPasskeyConsentStateCreate } from "./extensionPasskeyConsentStateCreate.js"

export interface ExtensionPasskeyConsentAppProps {
  options?: Parameters<typeof extensionPasskeyConsentStateCreate>[0]
  root?: "main" | "div"
}

export function ExtensionPasskeyConsentApp(props: ExtensionPasskeyConsentAppProps): JSX.Element {
  const state = extensionPasskeyConsentStateCreate(props.options)
  return (
    <Dynamic component={props.root ?? "main"} class="extension-page-surface flex min-h-dvh flex-col gap-4 p-5">
      <header class="flex items-center justify-between gap-2">
        <h1 class="text-lg font-semibold">Confirm passkey</h1>
        <Show when={state.model()}>{(model) => <ExtensionBadge>{model().rpId}</ExtensionBadge>}</Show>
      </header>
      <ExtensionSeparator />
      <Show when={state.busy() && state.model() === null}>
        <div role="status" aria-label="Loading passkey request" class="flex justify-center py-10">
          <LoaderShuffle4Dots />
        </div>
      </Show>
      <Show when={state.model()}>
        {(model) => (
          <>
            <p class="text-sm">
              {model().operation === "create" ? "Create a passkey for" : "Use a passkey for"}{" "}
              <strong>{model().rpName ?? model().rpId}</strong>.
            </p>
            <Show when={(model().verificationRequired && !model().verified) || model().locked}>
              <ExtensionCardWrapper class="flex flex-col gap-3">
                <p class="text-sm">
                  {model().verificationRequired
                    ? "Enter your master password for fresh verification."
                    : "Unlock your vault to continue."}
                </p>
                <ExtensionInputS
                  type="password"
                  autocomplete="current-password"
                  aria-label="Master password"
                  placeholder="Master password"
                  disabled={state.busy()}
                  valueSignal={state.passwordSignal}
                />
                <Button
                  variant="filledBlue"
                  class="extension-primary-control"
                  disabled={state.busy() || state.passwordSignal.get() === ""}
                  onClick={state.verify}
                >
                  Verify
                </Button>
              </ExtensionCardWrapper>
            </Show>
            <Show when={model().verified || (!model().verificationRequired && !model().locked)}>
              <Show
                when={model().candidates.length > 0}
                fallback={<p class="text-sm">No matching login or passkey is available.</p>}
              >
                <div role="listbox" aria-label="Passkey credentials" aria-busy={state.busy()}>
                  <CheckSingle
                    valueSignal={state.selectedKeySignal}
                    getOptions={() =>
                      model()
                        .candidates.filter((candidate) => !candidate.readOnly)
                        .map(state.candidateKey)
                    }
                    valueText={(key) => {
                      const candidate = model().candidates.find((value) => state.candidateKey(value) === key)
                      return candidate?.name ?? key
                    }}
                    valueTextSubtitle={(key) => {
                      const candidate = model().candidates.find((value) => state.candidateKey(value) === key)
                      if (candidate === undefined) return undefined
                      return `${candidate.userName ?? "No username"}${candidate.organization ? " · Organization" : ""}`
                    }}
                    valueTextSubtitleClass="extension-muted-text"
                    variant="ghost"
                    class="extension-credential-selector extension-card-surface"
                    optionClass="extension-selected-control extension-credential-option"
                    disabled={state.busy()}
                    disallowDeselection
                  />
                </div>
                <Show when={model().candidates.some((candidate) => candidate.readOnly)}>
                  <p class="extension-muted-text text-xs">Read-only organization logins cannot be updated.</p>
                </Show>
              </Show>
            </Show>
          </>
        )}
      </Show>
      <Show when={state.error()}>
        {(message) => (
          <p role="alert" class="extension-error-text text-sm">
            {message()}
          </p>
        )}
      </Show>
      <div class="mt-auto flex justify-end gap-2">
        <Button variant="outline" disabled={state.busy()} onClick={state.cancel}>
          Cancel
        </Button>
        <Button
          variant="filledBlue"
          class="extension-primary-control"
          disabled={state.busy() || state.selectedKeySignal.get() === ""}
          onClick={state.approve}
        >
          Confirm
        </Button>
      </div>
    </Dynamic>
  )
}
