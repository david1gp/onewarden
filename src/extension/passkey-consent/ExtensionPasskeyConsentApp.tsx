import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiClose } from "@adaptive-ds/mdi/mdiClose.js"
import { type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { CheckSingle } from "#ui/input/check/CheckSingle.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { extensionPasskeyConsentStateCreate } from "./extensionPasskeyConsentStateCreate.js"

export interface ExtensionPasskeyConsentAppProps {
  options?: Parameters<typeof extensionPasskeyConsentStateCreate>[0]
  root?: "main" | "div"
}

export function ExtensionPasskeyConsentApp(props: ExtensionPasskeyConsentAppProps): JSX.Element {
  const state = extensionPasskeyConsentStateCreate(props.options)
  return (
    <Dynamic component={props.root ?? "main"} class="extension-page-surface flex min-h-dvh flex-col gap-4 p-5">
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
              <strong>{model().rpName === null ? model().rpId : `${model().rpName} (${model().rpId})`}</strong>.
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
      <div class="mt-auto grid w-full grid-cols-2 gap-2">
        <ButtonIcon class="w-full" variant="outline" icon={mdiClose} disabled={state.busy()} onClick={state.cancel}>
          Cancel
        </ButtonIcon>
        <ButtonIcon
          variant="filledBlue"
          class="extension-primary-control w-full"
          icon={mdiCheck}
          disabled={state.busy() || state.selectedKeySignal.get() === ""}
          onClick={state.approve}
        >
          Confirm
        </ButtonIcon>
      </div>
    </Dynamic>
  )
}
