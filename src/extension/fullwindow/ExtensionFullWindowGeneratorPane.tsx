import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { mdiEye } from "@adaptive-ds/mdi/mdiEye.js"
import { mdiEyeOff } from "@adaptive-ds/mdi/mdiEyeOff.js"
import { mdiRefresh } from "@adaptive-ds/mdi/mdiRefresh.js"
import { type JSX, Show } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { ExtensionButtonIcon } from "../ui/ExtensionButtonIcon.jsx"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionCheckbox } from "../ui/ExtensionCheckbox.jsx"
import { ExtensionInput } from "../ui/ExtensionInput.jsx"
import { ExtensionSwitchSingle } from "../ui/ExtensionSwitchSingle.jsx"
import { extensionFullWindowGeneratorPaneStateCreate } from "./extensionFullWindowGeneratorPaneStateCreate.js"

const generatorModeText: Record<string, string> = {
  passphrase: "Passphrase",
  password: "Password",
}

/** Compact, full-window passphrase and password generator with secure local generation and copy controls. */
export function ExtensionFullWindowGeneratorPane(p: {
  options?: Parameters<typeof extensionFullWindowGeneratorPaneStateCreate>[0]
  idPrefix?: string
}): JSX.Element {
  const state = extensionFullWindowGeneratorPaneStateCreate(p.options)

  return (
    <section aria-label="Generator configuration" class="flex w-full min-w-0 flex-col gap-3 py-1 sm:py-2">
      <fieldset class="w-full sm:w-fit">
        <legend class="sr-only">Type</legend>
        <ExtensionSwitchSingle
          id={`${p.idPrefix ?? ""}generator-type`}
          valueSignal={state.modeSignal}
          getOptions={state.modeOptions}
          valueText={(mode) => generatorModeText[mode] ?? mode}
          disabled={state.copyStatus() === "copying"}
          class="w-full p-1 text-sm [&_[role=radio]]:grow sm:w-fit sm:[&_[role=radio]]:grow-0"
        />
      </fieldset>

      <ExtensionCardWrapper class="overflow-hidden rounded-xl p-0 shadow-sm">
        <div class="extension-subtle-surface p-2 sm:p-3">
          <Label for={`${p.idPrefix ?? ""}generated-password`} class="sr-only">
            Generated {state.passphraseMode() ? "passphrase" : "password"}
          </Label>
          <div class="flex min-w-0 flex-col gap-2 sm:flex-row">
            <ExtensionInput
              id={`${p.idPrefix ?? ""}generated-password`}
              type={state.passwordVisible() ? "text" : "password"}
              value={state.password()}
              readOnly
              autocomplete="off"
              spellcheck={false}
              class="h-11 min-w-0 grow px-3 font-mono text-sm tracking-wide sm:text-base"
            />
            <div class="grid shrink-0 grid-cols-3 gap-1.5 sm:flex sm:gap-2">
              <ExtensionButtonIcon
                variant="outline"
                icon={state.passwordVisible() ? mdiEyeOff : mdiEye}
                iconClass="mr-0 lg:mr-2"
                class="extension-selected-control h-11 w-full px-2 sm:w-auto sm:px-4"
                aria-label={state.passwordVisible() ? "Hide generated secret" : "Show generated secret"}
                aria-pressed={state.passwordVisible()}
                disabled={state.copyStatus() === "copying"}
                onClick={state.passwordVisibilityToggle}
              >
                <span class="hidden lg:inline">{state.passwordVisible() ? "Hide" : "Show"}</span>
              </ExtensionButtonIcon>
              <ExtensionButtonIcon
                variant="outline"
                icon={mdiRefresh}
                iconClass="mr-0 lg:mr-2"
                disabled={state.copyStatus() === "copying"}
                onClick={state.passwordRegenerate}
                aria-label={`Regenerate ${state.passphraseMode() ? "passphrase" : "password"}`}
                class="h-11 w-full px-2 sm:w-auto sm:px-4"
              >
                <span class="hidden lg:inline">Regenerate</span>
              </ExtensionButtonIcon>
              <ExtensionButtonIcon
                variant="filledBlue"
                icon={mdiContentCopy}
                iconClass="mr-0 lg:mr-2"
                isLoading={state.copyStatus() === "copying"}
                disabled={state.copyStatus() === "copying"}
                onClick={state.passwordCopy}
                aria-label={
                  state.copyStatus() === "copying" ? "Copying…" : state.copyStatus() === "copied" ? "Copied" : "Copy"
                }
                class="extension-primary-control h-11 w-full px-2 sm:w-auto sm:px-4 lg:min-w-24"
              >
                <span class="hidden lg:inline">
                  {state.copyStatus() === "copying" ? "Copying…" : state.copyStatus() === "copied" ? "Copied" : "Copy"}
                </span>
              </ExtensionButtonIcon>
            </div>
          </div>
          <Show when={state.copyStatus() === "error"}>
            <p role="alert" class="extension-error-text mt-2 text-xs">
              {state.passphraseMode() ? "Passphrase" : "Password"} could not be copied.
            </p>
          </Show>
          <Show when={state.errorMessage()}>
            {(message) => (
              <p role="alert" class="extension-error-text mt-2 text-xs">
                {message()}
              </p>
            )}
          </Show>
        </div>

        <Show
          when={state.passphraseMode()}
          fallback={
            <div class="grid gap-4 p-3 sm:p-4 md:grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.2fr)]">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <Label for={`${p.idPrefix ?? ""}password-length`} class="font-medium">
                      Length
                    </Label>
                    <p class="extension-muted-text text-xs">5–128 characters</p>
                  </div>
                  <ExtensionInput
                    id={`${p.idPrefix ?? ""}password-length`}
                    aria-label="Password length"
                    type="number"
                    min={5}
                    max={128}
                    value={state.lengthSignal.get()}
                    disabled={state.copyStatus() === "copying"}
                    onInput={state.passwordLengthInput}
                    class="h-10 w-20 text-center tabular-nums"
                  />
                </div>
                <input
                  aria-label="Password length slider"
                  type="range"
                  min="5"
                  max="128"
                  value={state.lengthSignal.get()}
                  disabled={state.copyStatus() === "copying"}
                  onInput={state.passwordLengthInput}
                  class="extension-range-control h-2 w-full cursor-pointer"
                />
              </div>

              <fieldset class="grid grid-cols-2 gap-x-4 gap-y-3">
                <legend class="col-span-2 mb-1 font-medium">Character groups</legend>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}generator-lowercase`}
                  checked={state.lowercase()}
                  disabled={state.lowercaseDisabled() || state.copyStatus() === "copying"}
                  onChange={state.lowercaseSet}
                >
                  <span class="text-sm">
                    Lowercase <span class="extension-muted-text hidden sm:inline">a–z</span>
                  </span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}generator-uppercase`}
                  checked={state.uppercase()}
                  disabled={state.uppercaseDisabled() || state.copyStatus() === "copying"}
                  onChange={state.uppercaseSet}
                >
                  <span class="text-sm">
                    Uppercase <span class="extension-muted-text hidden sm:inline">A–Z</span>
                  </span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}generator-numbers`}
                  checked={state.numbers()}
                  disabled={state.numbersDisabled() || state.copyStatus() === "copying"}
                  onChange={state.numbersSet}
                >
                  <span class="text-sm">
                    Numbers <span class="extension-muted-text hidden sm:inline">0–9</span>
                  </span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}generator-symbols`}
                  checked={state.symbols()}
                  disabled={state.symbolsDisabled() || state.copyStatus() === "copying"}
                  onChange={state.symbolsSet}
                >
                  <span class="text-sm">
                    Symbols <span class="extension-muted-text hidden sm:inline">!@#$</span>
                  </span>
                </ExtensionCheckbox>
              </fieldset>
            </div>
          }
        >
          <div class="grid gap-4 p-3 sm:p-4 md:grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.2fr)]">
            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <Label for={`${p.idPrefix ?? ""}passphrase-word-count`} class="font-medium">
                    Number of words
                  </Label>
                  <p class="extension-muted-text text-xs">3–20 words</p>
                </div>
                <ExtensionInput
                  id={`${p.idPrefix ?? ""}passphrase-word-count`}
                  aria-label="Number of words"
                  type="number"
                  min={3}
                  max={20}
                  value={state.wordCount()}
                  disabled={state.copyStatus() === "copying"}
                  onInput={state.wordCountInput}
                  class="h-10 w-20 text-center tabular-nums"
                />
              </div>
              <input
                aria-label="Number of words slider"
                type="range"
                min="3"
                max="20"
                value={state.wordCount()}
                disabled={state.copyStatus() === "copying"}
                onInput={state.wordCountInput}
                class="extension-range-control h-2 w-full cursor-pointer"
              />
            </div>

            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <Label for={`${p.idPrefix ?? ""}passphrase-word-separator`} class="font-medium">
                    Word separator
                  </Label>
                  <p class="extension-muted-text text-xs">One character or empty</p>
                </div>
                <ExtensionInput
                  id={`${p.idPrefix ?? ""}passphrase-word-separator`}
                  aria-label="Word separator"
                  type="text"
                  maxLength={1}
                  autocomplete="off"
                  spellcheck={false}
                  value={state.wordSeparator()}
                  disabled={state.copyStatus() === "copying"}
                  onInput={state.wordSeparatorInput}
                  class="h-10 w-20 text-center font-mono"
                />
              </div>
              <ExtensionCheckbox
                id={`${p.idPrefix ?? ""}passphrase-include-number`}
                checked={state.includeNumber()}
                disabled={state.copyStatus() === "copying"}
                onChange={state.includeNumberSet}
              >
                <span class="text-sm">Include number</span>
              </ExtensionCheckbox>
            </div>
          </div>
        </Show>
      </ExtensionCardWrapper>
    </section>
  )
}
