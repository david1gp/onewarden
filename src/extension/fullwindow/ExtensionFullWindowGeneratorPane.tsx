import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { mdiEye } from "@adaptive-ds/mdi/mdiEye.js"
import { mdiEyeOff } from "@adaptive-ds/mdi/mdiEyeOff.js"
import { mdiFormTextboxPassword } from "@adaptive-ds/mdi/mdiFormTextboxPassword.js"
import { mdiKeyVariant } from "@adaptive-ds/mdi/mdiKeyVariant.js"
import { mdiRefresh } from "@adaptive-ds/mdi/mdiRefresh.js"
import { type JSX, Show } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { ExtensionButtonIcon } from "../ui/ExtensionButtonIcon.jsx"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionCheckbox } from "../ui/ExtensionCheckbox.jsx"
import { ExtensionInput } from "../ui/ExtensionInput.jsx"
import { extensionFullWindowGeneratorPaneStateCreate } from "./extensionFullWindowGeneratorPaneStateCreate.js"

/** Compact, full-window passphrase and password generator with secure local generation and copy controls. */
export function ExtensionFullWindowGeneratorPane(p: {
  options?: Parameters<typeof extensionFullWindowGeneratorPaneStateCreate>[0]
  idPrefix?: string
}): JSX.Element {
  const state = extensionFullWindowGeneratorPaneStateCreate(p.options)

  return (
    <section aria-label="Generator configuration" class="flex w-full min-w-0 flex-col gap-3 py-1 sm:py-2">
      <fieldset
        id={`${p.idPrefix ?? ""}generator-type`}
        aria-label="Generator type"
        class="grid w-full grid-cols-2 gap-1 border-0 p-0 text-sm sm:w-fit"
      >
        <legend class="sr-only">Generator type</legend>
        <ExtensionButtonIcon
          variant="ghost"
          icon={mdiKeyVariant}
          role="radio"
          aria-checked={state.passphraseMode()}
          disabled={state.copyStatus() === "copying"}
          onClick={() => state.modeSignal.set("passphrase")}
          class="extension-generator-mode-control min-h-10 min-w-0 rounded-lg border px-3 sm:min-w-32"
        >
          Passphrase
        </ExtensionButtonIcon>
        <ExtensionButtonIcon
          variant="ghost"
          icon={mdiFormTextboxPassword}
          role="radio"
          aria-checked={!state.passphraseMode()}
          disabled={state.copyStatus() === "copying"}
          onClick={() => state.modeSignal.set("password")}
          class="extension-generator-mode-control min-h-10 min-w-0 rounded-lg border px-3 sm:min-w-32"
        >
          Password
        </ExtensionButtonIcon>
      </fieldset>

      <ExtensionCardWrapper class="overflow-hidden rounded-xl p-0 shadow-sm">
        <div class="extension-subtle-surface p-2 sm:p-3">
          <Label for={`${p.idPrefix ?? ""}generated-password`} class="sr-only">
            Generated {state.passphraseMode() ? "passphrase" : "password"}
          </Label>
          <div class="flex min-w-0 flex-col gap-2 lg:flex-row">
            <ExtensionInput
              id={`${p.idPrefix ?? ""}generated-password`}
              type={state.passwordVisible() ? "text" : "password"}
              value={state.password()}
              readOnly
              autocomplete="off"
              spellcheck={false}
              class="h-11 min-w-0 grow px-3 font-mono text-sm tracking-wide sm:text-base"
            />
            <div class="grid shrink-0 grid-cols-1 gap-1.5 sm:grid-cols-3 lg:flex lg:gap-2">
              <ExtensionButtonIcon
                variant="filledBlue"
                icon={mdiContentCopy}
                iconClass="mr-2"
                isLoading={state.copyStatus() === "copying"}
                disabled={state.copyStatus() === "copying"}
                onClick={state.passwordCopy}
                aria-label={
                  state.copyStatus() === "copying" ? "Copying…" : state.copyStatus() === "copied" ? "Copied" : "Copy"
                }
                class="extension-primary-control h-11 w-full px-2 sm:w-auto sm:px-4 lg:min-w-24"
              >
                <span>
                  {state.copyStatus() === "copying" ? "Copying…" : state.copyStatus() === "copied" ? "Copied" : "Copy"}
                </span>
              </ExtensionButtonIcon>
              <ExtensionButtonIcon
                variant="outline"
                icon={mdiRefresh}
                iconClass="mr-2"
                disabled={state.copyStatus() === "copying"}
                onClick={state.passwordRegenerate}
                aria-label={`Regenerate ${state.passphraseMode() ? "passphrase" : "password"}`}
                class="h-11 w-full px-2 sm:w-auto sm:px-4"
              >
                <span>Regenerate</span>
              </ExtensionButtonIcon>
              <ExtensionButtonIcon
                variant="outline"
                icon={state.passwordVisible() ? mdiEyeOff : mdiEye}
                iconClass="mr-2"
                class="extension-selected-control h-11 w-full px-2 sm:w-auto sm:px-4"
                aria-label={state.passwordVisible() ? "Hide generated secret" : "Show generated secret"}
                aria-pressed={state.passwordVisible()}
                disabled={state.copyStatus() === "copying"}
                onClick={state.passwordVisibilityToggle}
              >
                <span>{state.passwordVisible() ? "Hide" : "Show"}</span>
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
