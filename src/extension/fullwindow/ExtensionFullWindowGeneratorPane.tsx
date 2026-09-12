import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { mdiEye } from "@adaptive-ds/mdi/mdiEye.js"
import { mdiEyeOff } from "@adaptive-ds/mdi/mdiEyeOff.js"
import { mdiKey } from "@adaptive-ds/mdi/mdiKey.js"
import { mdiRefresh } from "@adaptive-ds/mdi/mdiRefresh.js"
import { type JSX, Show } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
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
    <section
      aria-labelledby={`${p.idPrefix ?? ""}password-generator-title`}
      class="mx-auto flex w-full max-w-6xl flex-col gap-4 py-2 sm:py-5"
    >
      <div class="flex items-start gap-3 px-1">
        <span class="extension-info-surface flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Icon path={mdiKey} class="size-5" />
        </span>
        <div>
          <h2 id={`${p.idPrefix ?? ""}password-generator-title`} class="text-lg font-semibold tracking-tight">
            Generator
          </h2>
          <p class="extension-muted-text text-sm">Create a strong passphrase or password locally in your extension.</p>
        </div>
      </div>

      <ExtensionCardWrapper class="overflow-hidden rounded-xl p-0 shadow-sm">
        <fieldset class="extension-boundary flex flex-col gap-2 border-b p-3 sm:p-4">
          <legend class="font-medium">Type</legend>
          <ExtensionSwitchSingle
            id={`${p.idPrefix ?? ""}generator-type`}
            valueSignal={state.modeSignal}
            getOptions={state.modeOptions}
            valueText={(mode) => generatorModeText[mode] ?? mode}
            disabled={state.copyStatus() === "copying"}
            class="w-fit p-1"
          />
        </fieldset>

        <div class="extension-subtle-surface p-3 sm:p-4">
          <Label for={`${p.idPrefix ?? ""}generated-password`} class="sr-only">
            Generated {state.passphraseMode() ? "passphrase" : "password"}
          </Label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <ExtensionInput
              id={`${p.idPrefix ?? ""}generated-password`}
              type={state.passwordVisible() ? "text" : "password"}
              value={state.password()}
              readOnly
              autocomplete="off"
              spellcheck={false}
              class="h-12 min-w-0 grow px-3 font-mono text-base tracking-wide"
            />
            <div class="grid grid-cols-2 gap-2 sm:flex">
              <ExtensionButtonIcon
                variant="outline"
                icon={state.passwordVisible() ? mdiEyeOff : mdiEye}
                class="extension-selected-control h-12"
                aria-pressed={state.passwordVisible()}
                disabled={state.copyStatus() === "copying"}
                onClick={state.passwordVisibilityToggle}
              >
                {state.passwordVisible() ? "Hide" : "Show"}
              </ExtensionButtonIcon>
              <ExtensionButtonIcon
                variant="filledBlue"
                icon={mdiContentCopy}
                isLoading={state.copyStatus() === "copying"}
                disabled={state.copyStatus() === "copying"}
                onClick={state.passwordCopy}
                class="extension-primary-control h-12 min-w-24"
              >
                {state.copyStatus() === "copying" ? "Copying…" : state.copyStatus() === "copied" ? "Copied" : "Copy"}
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
            <div class="grid gap-5 p-4 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.2fr)] sm:p-5">
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
                    Lowercase <span class="extension-muted-text">a–z</span>
                  </span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}generator-uppercase`}
                  checked={state.uppercase()}
                  disabled={state.uppercaseDisabled() || state.copyStatus() === "copying"}
                  onChange={state.uppercaseSet}
                >
                  <span class="text-sm">
                    Uppercase <span class="extension-muted-text">A–Z</span>
                  </span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}generator-numbers`}
                  checked={state.numbers()}
                  disabled={state.numbersDisabled() || state.copyStatus() === "copying"}
                  onChange={state.numbersSet}
                >
                  <span class="text-sm">
                    Numbers <span class="extension-muted-text">0–9</span>
                  </span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}generator-symbols`}
                  checked={state.symbols()}
                  disabled={state.symbolsDisabled() || state.copyStatus() === "copying"}
                  onChange={state.symbolsSet}
                >
                  <span class="text-sm">
                    Symbols <span class="extension-muted-text">!@#$</span>
                  </span>
                </ExtensionCheckbox>
              </fieldset>
            </div>
          }
        >
          <div class="grid gap-5 p-4 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.2fr)] sm:p-5">
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

        <div class="extension-boundary flex border-t p-3 sm:justify-end">
          <ExtensionButtonIcon
            variant="outline"
            icon={mdiRefresh}
            disabled={state.copyStatus() === "copying"}
            onClick={state.passwordRegenerate}
            class="w-full sm:w-auto"
          >
            Regenerate {state.passphraseMode() ? "passphrase" : "password"}
          </ExtensionButtonIcon>
        </div>
      </ExtensionCardWrapper>

      <p class="extension-muted-text px-1 text-center text-xs">
        Secrets are generated with cryptographically secure randomness and never leave this device.
      </p>
    </section>
  )
}
