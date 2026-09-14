import { mdiCog } from "@adaptive-ds/mdi/mdiCog.js"
import { mdiKey } from "@adaptive-ds/mdi/mdiKey.js"
import { mdiLock } from "@adaptive-ds/mdi/mdiLock.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiWeatherNight } from "@adaptive-ds/mdi/mdiWeatherNight.js"
import { mdiWhiteBalanceSunny } from "@adaptive-ds/mdi/mdiWhiteBalanceSunny.js"
import { For, type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import type { ExtensionPopupPaneStorage } from "../storage/extensionPopupPaneStorageSchema.js"
import { ExtensionButtonIcon } from "../ui/ExtensionButtonIcon.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { ExtensionSeparatorWithText } from "../ui/ExtensionSeparatorWithText.jsx"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import { ExtensionPopupGeneratorPane } from "./ExtensionPopupGeneratorPane.jsx"
import { ExtensionPopupLoginCard } from "./ExtensionPopupLoginCard.jsx"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"
import { extensionPopupViewStateCreate } from "./extensionPopupViewStateCreate.js"

export interface ExtensionPopupViewProps {
  model: ExtensionPopupViewModel
  commands: ExtensionPopupCommands
  root?: "main" | "div"
  navigationLabel?: string
  idPrefix?: string
  theme?: () => "light" | "dark"
  onThemeChange?: (theme: "light" | "dark") => void
  generatorOptions?: Parameters<typeof ExtensionPopupGeneratorPane>[0]["options"]
  generatorPreferences?: () => ExtensionGeneratorPreferences
  generatorPreferencesLoaded?: () => boolean
  onGeneratorPreferencesChange?: (preferences: ExtensionGeneratorPreferences) => void
  initialPane?: () => ExtensionPopupPaneStorage["pane"]
  initialPaneLoaded?: () => boolean
  onPaneChange?: (pane: ExtensionPopupPaneStorage["pane"]) => void
}

/** Browser-action popup showing the vault filtered to the active site. */
export function ExtensionPopupView(p: ExtensionPopupViewProps): JSX.Element {
  const state = extensionPopupViewStateCreate(
    () => p.model,
    () => p.commands,
    {
      theme: p.theme,
      onThemeChange: p.onThemeChange,
      initialPane: p.initialPane,
      initialPaneLoaded: p.initialPaneLoaded,
      onPaneChange: p.onPaneChange,
    },
  )

  return (
    <Dynamic
      component={p.root ?? "main"}
      class="extension-page-surface extension-popup-surface box-border flex max-h-dvh w-90 max-w-full min-w-0 flex-col gap-2 overflow-hidden p-2"
    >
      <nav
        aria-label={p.navigationLabel ?? "Extension navigation"}
        class="extension-popup-navigation flex min-w-0 flex-wrap items-center gap-1"
      >
        <fieldset
          aria-label="Vault and generator"
          class="extension-popup-navigation-tabs m-0 grid min-w-40 flex-1 grid-cols-2 items-center gap-1 border-0 p-0"
        >
          <ExtensionButtonIcon
            variant="ghost"
            icon={mdiLock}
            aria-current={state.isVaultPane() ? "page" : undefined}
            disabled={state.busy()}
            onClick={state.vaultPaneOpen}
            class="extension-selected-control min-h-10 min-w-0 px-3"
          >
            Vault
          </ExtensionButtonIcon>
          <ExtensionButtonIcon
            variant="ghost"
            icon={mdiKey}
            aria-current={state.isGeneratorPane() ? "page" : undefined}
            disabled={state.busy()}
            onClick={state.generatorPaneOpen}
            class="extension-selected-control min-h-10 min-w-0 px-3"
          >
            Generator
          </ExtensionButtonIcon>
        </fieldset>
        <div class="ml-auto flex shrink-0 items-center gap-1">
          <ExtensionButtonIcon
            variant="ghost"
            icon={mdiCog}
            aria-label="Settings"
            disabled={state.busy()}
            onClick={state.settingsOpen}
            title="Open Settings in a full window"
            class="extension-popup-navigation-action extension-muted-text min-h-9 min-w-9 shrink-0 p-2"
          />
          <ExtensionButtonIcon
            icon={state.theme() === "dark" ? mdiWeatherNight : mdiWhiteBalanceSunny}
            variant="ghost"
            aria-label={`Switch to ${state.theme() === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${state.theme() === "dark" ? "light" : "dark"} theme`}
            onClick={state.themeToggle}
            class="extension-popup-navigation-action extension-muted-text min-h-9 min-w-9 shrink-0 p-2"
          />
        </div>
      </nav>

      <Show when={state.isGeneratorPane()}>
        <Show
          when={p.generatorPreferencesLoaded?.() ?? true}
          fallback={
            <div role="status" aria-label="Loading generator preferences" class="flex justify-center py-6">
              <LoaderShuffle4Dots />
            </div>
          }
        >
          <ExtensionPopupGeneratorPane
            idPrefix={p.idPrefix}
            options={
              p.generatorPreferences === undefined
                ? p.generatorOptions
                : {
                    ...p.generatorOptions,
                    initialPreferences: p.generatorPreferences(),
                    onPreferencesChange: p.onGeneratorPreferencesChange,
                  }
            }
          />
        </Show>
      </Show>

      <Show when={state.isVaultPane() && state.isLoading()}>
        <div role="status" aria-label="Loading vault" class="flex justify-center py-6">
          <LoaderShuffle4Dots />
        </div>
      </Show>

      <Show when={state.isVaultPane() && state.isLoggedOut()}>
        <section class="flex flex-col gap-2 py-4">
          <p class="text-sm">Sign in to use your vault on this site.</p>
          <Button
            variant="filledBlue"
            disabled={state.busy()}
            onClick={state.accountLogin}
            class="extension-primary-control"
          >
            Log in
          </Button>
          <Button variant="outline" disabled={state.busy()} onClick={state.accountRegister}>
            Create account
          </Button>
        </section>
      </Show>

      <Show when={state.isVaultPane() && state.isLocked()}>
        <section class="flex flex-col gap-2 py-4" aria-label="Unlock vault">
          <p class="text-sm">Your vault is locked.</p>
          <Show when={state.biometricAvailable() && state.biometricEnrolled()}>
            <Button
              variant="filledBlue"
              disabled={state.busy()}
              onClick={state.biometricUnlock}
              class="extension-primary-control"
            >
              Unlock with biometrics
            </Button>
            <ExtensionSeparatorWithText>
              <span class="extension-muted-text text-xs uppercase">or with password</span>
            </ExtensionSeparatorWithText>
          </Show>
          <ExtensionInputS
            type="password"
            aria-label="Master password"
            placeholder="Master password"
            autocomplete="current-password"
            disabled={state.busy()}
            valueSignal={state.masterPasswordSignal}
          />
          <Button
            variant={state.biometricAvailable() && state.biometricEnrolled() ? "outline" : "filledBlue"}
            disabled={state.busy()}
            onClick={state.vaultUnlock}
            class={state.biometricAvailable() && state.biometricEnrolled() ? undefined : "extension-primary-control"}
          >
            Unlock
          </Button>
          <Show when={state.errorMessage()}>
            {(message) => (
              <p role="alert" class="extension-error-text text-xs">
                {message()}
              </p>
            )}
          </Show>
        </section>
      </Show>

      <Show when={state.isVaultPane() && state.isError()}>
        <section role="alert" class="flex flex-col gap-2 py-4">
          <p class="extension-error-text text-sm">{state.errorMessage() ?? "Something went wrong."}</p>
          <Button variant="outline" disabled={state.busy()} onClick={state.vaultSync}>
            Retry
          </Button>
        </section>
      </Show>

      <Show when={state.isVaultPane() && state.isReady()}>
        <div class="flex min-w-0 items-center gap-2">
          <ExtensionInputS
            type="search"
            id={`${p.idPrefix ?? ""}popup-login-search`}
            aria-label="Search logins"
            placeholder="Search logins"
            autocomplete="off"
            disabled={state.busy()}
            valueSignal={state.searchQuerySignal}
            class="min-w-0 flex-1"
          />
          <ExtensionButtonIcon
            variant="outline"
            icon={mdiPlus}
            aria-label="Add login"
            title="Add login"
            disabled={state.busy()}
            onClick={state.loginAdd}
            class="min-h-10 min-w-10 shrink-0 p-2"
          />
        </div>

        <Show when={state.errorMessage()}>
          {(message) => (
            <p role="alert" class="extension-error-text text-xs">
              {message()}
            </p>
          )}
        </Show>

        <Show when={!state.isEmpty()}>
          <ul
            class="grid min-h-0 min-w-0 flex-1 grid-cols-1 list-none gap-2 overflow-y-auto pr-1"
            aria-label="Saved logins"
          >
            <For each={state.visibleLogins()}>
              {(login) => (
                <li class="min-w-0">
                  <ExtensionPopupLoginCard
                    login={login}
                    disabled={state.busy()}
                    fillAvailable={state.fillAvailable()}
                    fieldIsCopied={state.fieldIsCopied}
                    onEdit={state.loginEdit}
                    onFill={state.loginFill}
                    onCopy={state.fieldCopy}
                    totpIsCopied={state.totpIsCopied}
                    onTotpCopy={state.totpCopy}
                  />
                </li>
              )}
            </For>
          </ul>
        </Show>

        <Show when={state.isEmpty()}>
          <p role="status" class="extension-muted-text py-4 text-center text-sm">
            {state.hasNoLogins() ? "No logins saved for this site." : "No logins match your search."}
          </p>
        </Show>
      </Show>
    </Dynamic>
  )
}
