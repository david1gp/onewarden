import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { mdiEye } from "@adaptive-ds/mdi/mdiEye.js"
import { mdiEyeOff } from "@adaptive-ds/mdi/mdiEyeOff.js"
import { mdiRefresh } from "@adaptive-ds/mdi/mdiRefresh.js"
import { type JSX, Show } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { extensionFullWindowGeneratorPaneStateCreate } from "../fullwindow/extensionFullWindowGeneratorPaneStateCreate.js"
import { ExtensionButtonIcon } from "../ui/ExtensionButtonIcon.jsx"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionCheckbox } from "../ui/ExtensionCheckbox.jsx"
import { ExtensionInput } from "../ui/ExtensionInput.jsx"
import { ExtensionSwitchSingle } from "../ui/ExtensionSwitchSingle.jsx"

const generatorModeText: Record<string, string> = {
  passphrase: "Passphrase",
  password: "Password",
}

/** Compact popup surface backed by the shared extension generator state. */
export function ExtensionPopupGeneratorPane(p: {
  options?: Parameters<typeof extensionFullWindowGeneratorPaneStateCreate>[0]
  idPrefix?: string
}): JSX.Element {
  const state = extensionFullWindowGeneratorPaneStateCreate(p.options)

  return (
    <section aria-labelledby={`${p.idPrefix ?? ""}popup-generator-title`} class="flex min-w-0 flex-col gap-3">
      <div class="flex items-center justify-between gap-2 px-1">
        <div>
          <h2 id={`${p.idPrefix ?? ""}popup-generator-title`} class="text-sm font-semibold">
            Generator
          </h2>
          <p class="extension-muted-text text-xs">Generated securely on this device.</p>
        </div>
        <ExtensionSwitchSingle
          id={`${p.idPrefix ?? ""}popup-generator-type`}
          valueSignal={state.modeSignal}
          getOptions={state.modeOptions}
          valueText={(mode) => generatorModeText[mode] ?? mode}
          disabled={state.copyStatus() === "copying"}
          class="shrink-0 p-1 text-xs"
        />
      </div>

      <ExtensionCardWrapper class="overflow-hidden rounded-xl p-0 shadow-sm">
        <div class="extension-subtle-surface flex gap-1.5 p-2">
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
            class="h-10 min-w-0 grow px-2 font-mono text-sm"
          />
          <ExtensionButtonIcon
            variant="ghost"
            size="sm"
            icon={state.passwordVisible() ? mdiEyeOff : mdiEye}
            aria-label={state.passwordVisible() ? "Hide generated secret" : "Reveal generated secret"}
            aria-pressed={state.passwordVisible()}
            disabled={state.copyStatus() === "copying"}
            onClick={state.passwordVisibilityToggle}
          />
          <ExtensionButtonIcon
            variant="ghost"
            size="sm"
            icon={mdiRefresh}
            aria-label={`Regenerate ${state.passphraseMode() ? "passphrase" : "password"}`}
            disabled={state.copyStatus() === "copying"}
            onClick={state.passwordRegenerate}
          />
          <ExtensionButtonIcon
            variant="filledBlue"
            size="sm"
            icon={mdiContentCopy}
            aria-label={`Copy generated ${state.passphraseMode() ? "passphrase" : "password"}`}
            isLoading={state.copyStatus() === "copying"}
            disabled={state.copyStatus() === "copying"}
            onClick={state.passwordCopy}
            class="extension-primary-control"
          />
        </div>

        <Show
          when={state.passphraseMode()}
          fallback={
            <div class="flex flex-col gap-3 p-3">
              <div class="flex items-center gap-3">
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
          <div class="grid grid-cols-2 gap-3 p-3">
            <div class="flex items-center justify-between gap-2">
              <Label for={`${p.idPrefix ?? ""}popup-word-count`} class="text-xs font-medium">
                Words
              </Label>
              <ExtensionInput
                id={`${p.idPrefix ?? ""}popup-word-count`}
                aria-label="Number of words"
                type="number"
                min={3}
                max={20}
                value={state.wordCount()}
                disabled={state.copyStatus() === "copying"}
                onInput={state.wordCountInput}
                class="h-9 w-14 text-center tabular-nums"
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
              class="col-span-2"
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
