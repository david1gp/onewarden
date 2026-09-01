import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { mdiEye } from "@adaptive-ds/mdi/mdiEye.js"
import { mdiEyeOff } from "@adaptive-ds/mdi/mdiEyeOff.js"
import { mdiKey } from "@adaptive-ds/mdi/mdiKey.js"
import { mdiRefresh } from "@adaptive-ds/mdi/mdiRefresh.js"
import { type JSX, Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SwitchSingle } from "#ui/input/switch/SwitchSingle.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
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
      class="mx-auto flex w-full max-w-3xl flex-col gap-4 py-2 sm:py-5"
    >
      <div class="flex items-start gap-3 px-1">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <Icon path={mdiKey} class="size-5" />
        </span>
        <div>
          <h2 id={`${p.idPrefix ?? ""}password-generator-title`} class="text-lg font-semibold tracking-tight">
            Generator
          </h2>
          <p class="text-sm text-slate-600 dark:text-slate-300">
            Create a strong passphrase or password locally in your extension.
          </p>
        </div>
      </div>

      <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <fieldset class="flex flex-col gap-2 border-b border-slate-200 p-3 sm:p-4 dark:border-slate-700">
          <legend class="font-medium">Type</legend>
          <SwitchSingle
            id={`${p.idPrefix ?? ""}generator-type`}
            valueSignal={state.modeSignal}
            getOptions={state.modeOptions}
            valueText={(mode) => generatorModeText[mode] ?? mode}
            class="w-fit p-1 [&_[data-state=checked]]:bg-blue-700"
          />
        </fieldset>

        <div class="bg-slate-50 p-3 sm:p-4 dark:bg-slate-950/60">
          <Label for={`${p.idPrefix ?? ""}generated-password`} class="sr-only">
            Generated {state.passphraseMode() ? "passphrase" : "password"}
          </Label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${p.idPrefix ?? ""}generated-password`}
              type={state.passwordVisible() ? "text" : "password"}
              value={state.password()}
              readOnly
              autocomplete="off"
              spellcheck={false}
              class="h-12 min-w-0 grow border-slate-300 bg-white px-3 font-mono text-base tracking-wide dark:border-slate-700 dark:bg-slate-900"
            />
            <div class="grid grid-cols-2 gap-2 sm:flex">
              <ButtonIcon
                variant="outline"
                icon={state.passwordVisible() ? mdiEyeOff : mdiEye}
                aria-pressed={state.passwordVisible()}
                onClick={state.passwordVisibilityToggle}
                class="h-12"
              >
                {state.passwordVisible() ? "Hide" : "Show"}
              </ButtonIcon>
              <ButtonIcon variant="filledBlue" icon={mdiContentCopy} onClick={state.passwordCopy} class="h-12 min-w-24">
                {state.copyStatus() === "copying" ? "Copying…" : state.copyStatus() === "copied" ? "Copied" : "Copy"}
              </ButtonIcon>
            </div>
          </div>
          <Show when={state.copyStatus() === "error"}>
            <p role="alert" class="mt-2 text-xs text-red-600 dark:text-red-400">
              {state.passphraseMode() ? "Passphrase" : "Password"} could not be copied.
            </p>
          </Show>
          <Show when={state.errorMessage()}>
            {(message) => (
              <p role="alert" class="mt-2 text-xs text-red-600 dark:text-red-400">
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
                    <p class="text-xs text-slate-500 dark:text-slate-400">5–128 characters</p>
                  </div>
                  <Input
                    id={`${p.idPrefix ?? ""}password-length`}
                    aria-label="Password length"
                    type="number"
                    min={5}
                    max={128}
                    value={state.lengthSignal.get()}
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
                  onInput={state.passwordLengthInput}
                  class="h-2 w-full cursor-pointer accent-blue-600"
                />
              </div>

              <fieldset class="grid grid-cols-2 gap-x-4 gap-y-3">
                <legend class="col-span-2 mb-1 font-medium">Character groups</legend>
                <Checkbox
                  id={`${p.idPrefix ?? ""}generator-lowercase`}
                  checked={state.lowercase()}
                  disabled={state.lowercaseDisabled()}
                  onChange={state.lowercaseSet}
                >
                  <span class="text-sm">
                    Lowercase <span class="text-slate-500 dark:text-slate-300">a–z</span>
                  </span>
                </Checkbox>
                <Checkbox
                  id={`${p.idPrefix ?? ""}generator-uppercase`}
                  checked={state.uppercase()}
                  disabled={state.uppercaseDisabled()}
                  onChange={state.uppercaseSet}
                >
                  <span class="text-sm">
                    Uppercase <span class="text-slate-500 dark:text-slate-300">A–Z</span>
                  </span>
                </Checkbox>
                <Checkbox
                  id={`${p.idPrefix ?? ""}generator-numbers`}
                  checked={state.numbers()}
                  disabled={state.numbersDisabled()}
                  onChange={state.numbersSet}
                >
                  <span class="text-sm">
                    Numbers <span class="text-slate-500 dark:text-slate-300">0–9</span>
                  </span>
                </Checkbox>
                <Checkbox
                  id={`${p.idPrefix ?? ""}generator-symbols`}
                  checked={state.symbols()}
                  disabled={state.symbolsDisabled()}
                  onChange={state.symbolsSet}
                >
                  <span class="text-sm">
                    Symbols <span class="text-slate-500">!@#$</span>
                  </span>
                </Checkbox>
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
                  <p class="text-xs text-slate-500 dark:text-slate-400">3–20 words</p>
                </div>
                <Input
                  id={`${p.idPrefix ?? ""}passphrase-word-count`}
                  aria-label="Number of words"
                  type="number"
                  min={3}
                  max={20}
                  value={state.wordCount()}
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
                onInput={state.wordCountInput}
                class="h-2 w-full cursor-pointer accent-blue-600"
              />
            </div>

            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <Label for={`${p.idPrefix ?? ""}passphrase-word-separator`} class="font-medium">
                    Word separator
                  </Label>
                  <p class="text-xs text-slate-500 dark:text-slate-400">One character or empty</p>
                </div>
                <Input
                  id={`${p.idPrefix ?? ""}passphrase-word-separator`}
                  aria-label="Word separator"
                  type="text"
                  maxLength={1}
                  autocomplete="off"
                  spellcheck={false}
                  value={state.wordSeparator()}
                  onInput={state.wordSeparatorInput}
                  class="h-10 w-20 text-center font-mono"
                />
              </div>
              <Checkbox
                id={`${p.idPrefix ?? ""}passphrase-include-number`}
                checked={state.includeNumber()}
                onChange={state.includeNumberSet}
              >
                <span class="text-sm">Include number</span>
              </Checkbox>
            </div>
          </div>
        </Show>

        <div class="flex border-t border-slate-200 p-3 sm:justify-end dark:border-slate-700">
          <ButtonIcon variant="outline" icon={mdiRefresh} onClick={state.passwordRegenerate} class="w-full sm:w-auto">
            Regenerate {state.passphraseMode() ? "passphrase" : "password"}
          </ButtonIcon>
        </div>
      </CardWrapper>

      <p class="px-1 text-center text-xs text-slate-500 dark:text-slate-400">
        Secrets are generated with cryptographically secure randomness and never leave this device.
      </p>
    </section>
  )
}
