import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { mdiEye } from "@adaptive-ds/mdi/mdiEye.js"
import { mdiEyeOff } from "@adaptive-ds/mdi/mdiEyeOff.js"
import { mdiFormTextboxPassword } from "@adaptive-ds/mdi/mdiFormTextboxPassword.js"
import { mdiKeyVariant } from "@adaptive-ds/mdi/mdiKeyVariant.js"
import { mdiRefresh } from "@adaptive-ds/mdi/mdiRefresh.js"
import { type JSX, Show } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { NumberInputS } from "#ui/input/number/NumberInputS.jsx"
import { extensionFullWindowGeneratorPaneStateCreate } from "../fullwindow/extensionFullWindowGeneratorPaneStateCreate.js"
import { ExtensionButtonIcon } from "../ui/ExtensionButtonIcon.jsx"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionCheckbox } from "../ui/ExtensionCheckbox.jsx"
import { ExtensionInput } from "../ui/ExtensionInput.jsx"

/** Compact popup surface backed by the shared extension generator state. */
export function ExtensionPopupGeneratorPane(p: {
  options?: Parameters<typeof extensionFullWindowGeneratorPaneStateCreate>[0]
  idPrefix?: string
}): JSX.Element {
  const state = extensionFullWindowGeneratorPaneStateCreate(p.options)

  return (
    <section aria-label="Generator" class="flex min-w-0 flex-col gap-1">
      <fieldset
        id={`${p.idPrefix ?? ""}popup-generator-type`}
        aria-label="Generator type"
        class="grid min-w-0 grid-cols-2 gap-1 border-0 p-0"
      >
        <legend class="sr-only">Generator type</legend>
        <ExtensionButtonIcon
          variant="ghost"
          icon={mdiKeyVariant}
          role="radio"
          aria-checked={state.passphraseMode()}
          disabled={state.copyStatus() === "copying"}
          onClick={() => state.modeSignal.set("passphrase")}
          class="extension-generator-mode-control min-h-9 min-w-0 rounded-lg border px-2 text-xs"
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
          class="extension-generator-mode-control min-h-9 min-w-0 rounded-lg border px-2 text-xs"
        >
          Password
        </ExtensionButtonIcon>
      </fieldset>

      <ExtensionCardWrapper class="extension-popup-generator-surface overflow-hidden rounded-xl p-0 shadow-sm">
        <div class="extension-subtle-surface grid min-w-0 gap-1.5 p-1.5">
          <Label for={`${p.idPrefix ?? ""}popup-generated-secret`} class="sr-only">
            Generated {state.passphraseMode() ? "passphrase" : "password"}
          </Label>
          <ExtensionInput
            id={`${p.idPrefix ?? ""}popup-generated-secret`}
            type={state.passwordVisible() ? "text" : "password"}
            value={state.password()}
            readOnly
            autocomplete="off"
            spellcheck={false}
            class="h-10 w-full min-w-0 px-2 font-mono text-sm"
          />
          <div class="extension-generator-actions grid grid-cols-3 gap-1">
            <ExtensionButtonIcon
              variant="filledBlue"
              icon={mdiContentCopy}
              aria-label={`Copy generated ${state.passphraseMode() ? "passphrase" : "password"}`}
              title={`Copy generated ${state.passphraseMode() ? "passphrase" : "password"}`}
              isLoading={state.copyStatus() === "copying"}
              disabled={state.copyStatus() === "copying"}
              onClick={state.passwordCopy}
              class="extension-primary-control min-h-9 w-full px-1"
            />
            <ExtensionButtonIcon
              variant="ghost"
              icon={mdiRefresh}
              aria-label={`Regenerate ${state.passphraseMode() ? "passphrase" : "password"}`}
              title={`Regenerate ${state.passphraseMode() ? "passphrase" : "password"}`}
              disabled={state.copyStatus() === "copying"}
              onClick={state.passwordRegenerate}
              class="min-h-9 w-full px-1"
            />
            <ExtensionButtonIcon
              variant="ghost"
              icon={state.passwordVisible() ? mdiEyeOff : mdiEye}
              aria-label={state.passwordVisible() ? "Hide generated secret" : "Show generated secret"}
              title={state.passwordVisible() ? "Hide generated secret" : "Show generated secret"}
              aria-pressed={state.passwordVisible()}
              disabled={state.copyStatus() === "copying"}
              onClick={state.passwordVisibilityToggle}
              class="min-h-9 w-full px-1"
            />
          </div>
        </div>

        <Show
          when={state.passphraseMode()}
          fallback={
            <div class="flex flex-col gap-2 p-2">
              <div class="flex items-center gap-2">
                <Label for={`${p.idPrefix ?? ""}popup-password-length`} class="shrink-0 text-sm font-medium">
                  Length
                </Label>
                <input
                  aria-label="Password length slider"
                  type="range"
                  min="5"
                  max="128"
                  value={state.lengthSignal.get()}
                  disabled={state.copyStatus() === "copying"}
                  onInput={state.passwordLengthInput}
                  class="extension-range-control h-2 min-w-0 grow cursor-pointer"
                />
                <ExtensionInput
                  id={`${p.idPrefix ?? ""}popup-password-length`}
                  aria-label="Password length"
                  type="number"
                  min={5}
                  max={128}
                  value={state.lengthSignal.get()}
                  disabled={state.copyStatus() === "copying"}
                  onInput={state.passwordLengthInput}
                  class="h-9 w-16 text-center tabular-nums"
                />
              </div>
              <fieldset class="grid grid-cols-2 gap-x-3 gap-y-2">
                <legend class="sr-only">Character groups</legend>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}popup-generator-lowercase`}
                  checked={state.lowercase()}
                  disabled={state.lowercaseDisabled() || state.copyStatus() === "copying"}
                  onChange={state.lowercaseSet}
                >
                  <span class="text-xs">Lowercase</span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}popup-generator-uppercase`}
                  checked={state.uppercase()}
                  disabled={state.uppercaseDisabled() || state.copyStatus() === "copying"}
                  onChange={state.uppercaseSet}
                >
                  <span class="text-xs">Uppercase</span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}popup-generator-numbers`}
                  checked={state.numbers()}
                  disabled={state.numbersDisabled() || state.copyStatus() === "copying"}
                  onChange={state.numbersSet}
                >
                  <span class="text-xs">Numbers</span>
                </ExtensionCheckbox>
                <ExtensionCheckbox
                  id={`${p.idPrefix ?? ""}popup-generator-symbols`}
                  checked={state.symbols()}
                  disabled={state.symbolsDisabled() || state.copyStatus() === "copying"}
                  onChange={state.symbolsSet}
                >
                  <span class="text-xs">Symbols</span>
                </ExtensionCheckbox>
              </fieldset>
            </div>
          }
        >
          <div class="flex flex-col gap-2 p-2">
            <div class="flex items-center justify-between gap-2">
              <Label for={`${p.idPrefix ?? ""}popup-word-count`} class="text-xs font-medium">
                Words
              </Label>
              <NumberInputS
                id={`${p.idPrefix ?? ""}popup-word-count`}
                aria-label="Number of words"
                valueSignal={state.wordCountSignal}
                min={3}
                max={20}
                disabled={state.copyStatus() === "copying"}
                onValueChange={state.wordCountSet}
                class="shrink-0"
                inputClass="extension-input-control extension-number-input h-9 w-14 tabular-nums"
                buttonClass="extension-icon-control size-9 p-1"
              />
            </div>
            <div class="flex items-center justify-between gap-2">
              <Label for={`${p.idPrefix ?? ""}popup-word-separator`} class="text-xs font-medium">
                Separator
              </Label>
              <ExtensionInput
                id={`${p.idPrefix ?? ""}popup-word-separator`}
                aria-label="Word separator"
                type="text"
                maxLength={1}
                value={state.wordSeparator()}
                disabled={state.copyStatus() === "copying"}
                onInput={state.wordSeparatorInput}
                class="h-9 w-12 text-center font-mono"
              />
            </div>
            <ExtensionCheckbox
              id={`${p.idPrefix ?? ""}popup-include-number`}
              checked={state.includeNumber()}
              disabled={state.copyStatus() === "copying"}
              onChange={state.includeNumberSet}
            >
              <span class="text-xs">Include a number</span>
            </ExtensionCheckbox>
          </div>
        </Show>
      </ExtensionCardWrapper>

      <Show when={state.copyStatus() === "copied"}>
        <p role="status" class="extension-muted-text text-center text-xs">
          Copied to clipboard.
        </p>
      </Show>
      <Show when={state.copyStatus() === "error" || state.errorMessage() !== null}>
        <p role="alert" class="extension-error-text text-center text-xs">
          {state.errorMessage() ?? "The generated secret could not be copied."}
        </p>
      </Show>
    </section>
  )
}
