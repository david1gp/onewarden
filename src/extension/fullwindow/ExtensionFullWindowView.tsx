import { mdiCog } from "@adaptive-ds/mdi/mdiCog.js"
import { mdiKey } from "@adaptive-ds/mdi/mdiKey.js"
import { mdiLock } from "@adaptive-ds/mdi/mdiLock.js"
import { For, type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { Separator } from "#ui/static/separator/Separator.jsx"
import type { VaultSort } from "../../shared/vault/vaultSortSchema.js"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import { ExtensionFullWindowCardPane } from "./ExtensionFullWindowCardPane.jsx"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import { ExtensionFullWindowGeneratorPane } from "./ExtensionFullWindowGeneratorPane.jsx"
import { ExtensionFullWindowIdentityPane } from "./ExtensionFullWindowIdentityPane.jsx"
import { ExtensionFullWindowLoginDetail } from "./ExtensionFullWindowLoginDetail.jsx"
import { ExtensionFullWindowLoginRow } from "./ExtensionFullWindowLoginRow.jsx"
import { ExtensionFullWindowResourceNavigation } from "./ExtensionFullWindowResourceNavigation.jsx"
import { ExtensionFullWindowSecureNotePane } from "./ExtensionFullWindowSecureNotePane.jsx"
import { ExtensionFullWindowSettingsPane } from "./ExtensionFullWindowSettingsPane.jsx"
import { ExtensionFullWindowSshKeyPane } from "./ExtensionFullWindowSshKeyPane.jsx"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowViewStateCreate } from "./extensionFullWindowViewStateCreate.js"

export interface ExtensionFullWindowViewProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  initialState?: { pane?: string; selectedLoginId?: string }
  generatorOptions?: Parameters<typeof ExtensionFullWindowGeneratorPane>[0]["options"]
  generatorPreferences?: () => ExtensionGeneratorPreferences
  generatorPreferencesLoaded?: () => boolean
  onGeneratorPreferencesChange?: (preferences: ExtensionGeneratorPreferences) => void
  vaultSort?: () => VaultSort
  vaultSortLoaded?: () => boolean
  onVaultSortChange?: (sort: VaultSort) => void
  idPrefix?: string
  root?: "main" | "div"
  navigationLabel?: string
}

/** Full-window vault with navigation, list, detail, and server settings panes. */
export function ExtensionFullWindowView(p: ExtensionFullWindowViewProps): JSX.Element {
  const state = extensionFullWindowViewStateCreate(p.model, () => p.commands, p.initialState, {
    vaultSort: p.vaultSort,
    onVaultSortChange: p.onVaultSortChange,
  })

  return (
    <Dynamic
      component={p.root ?? "main"}
      class="flex min-h-dvh flex-col gap-3 bg-slate-50 p-4 text-slate-900 md:p-6 dark:bg-slate-950 dark:text-slate-100"
    >
      <header class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-semibold">OneWarden Vault</h1>
        <Badge role="group" aria-label="Active site">
          {state.siteLabel()}
        </Badge>
      </header>

      <nav
        aria-label={p.navigationLabel ?? "Extension navigation"}
        class="flex flex-wrap items-center gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-900"
      >
        <ButtonIcon
          variant={state.isVaultPane() ? "filledBlue" : "ghost"}
          size="sm"
          icon={mdiLock}
          aria-current={state.isVaultPane() ? "page" : undefined}
          onClick={state.vaultPaneOpen}
          class="min-h-10"
        >
          Vault
        </ButtonIcon>
        <ButtonIcon
          variant={state.isGeneratorPane() ? "filledBlue" : "ghost"}
          size="sm"
          icon={mdiKey}
          aria-current={state.isGeneratorPane() ? "page" : undefined}
          onClick={state.generatorPaneOpen}
          class="min-h-10"
        >
          Generator
        </ButtonIcon>
        <ButtonIcon
          variant={state.isSettingsPane() ? "filledBlue" : "ghost"}
          size="sm"
          icon={mdiCog}
          aria-current={state.isSettingsPane() ? "page" : undefined}
          onClick={state.settingsPaneOpen}
          class="min-h-10"
        >
          Settings
        </ButtonIcon>
        <Show when={state.isVaultPane()}>
          <span aria-hidden="true" class="mx-1 hidden h-6 w-px bg-slate-300 sm:block dark:bg-slate-700" />
          <Show when={state.isLoginCategory()}>
            <Button variant="ghost" size="sm" disabled={state.busy() || !state.isReady()} onClick={state.loginAdd}>
              Add login
            </Button>
          </Show>
          <Button variant="ghost" size="sm" disabled={state.busy()} onClick={state.vaultSync}>
            Sync
          </Button>
          <Show when={state.isReady()}>
            <Button variant="ghost" size="sm" disabled={state.busy()} onClick={state.vaultLock}>
              Lock
            </Button>
          </Show>
          <Show when={!state.isLoggedOut()}>
            <Button variant="ghost" size="sm" disabled={state.busy()} onClick={state.vaultLogout}>
              Log out
            </Button>
          </Show>
        </Show>
      </nav>

      <Separator />

      <Show when={state.isSettingsPane()}>
        <ExtensionFullWindowSettingsPane
          idPrefix={p.idPrefix}
          disabled={state.busy()}
          environmentSaveStatus={state.environmentSaveStatus()}
          errorMessage={state.environmentSaveErrorMessage()}
          regionSignal={state.regionSignal}
          regionOptions={state.regionOptions}
          regionLabel={state.regionLabel}
          isSelfHosted={state.isSelfHosted()}
          fieldSignal={state.environmentFieldSignal}
          onSave={state.environmentSave}
          securityAvailable={state.securitySettingsAvailable()}
          securityLoading={state.securitySettingsLoading()}
          securitySaveStatus={state.securitySaveStatus()}
          securityErrorMessage={state.securityErrorMessage()}
          securityTimeoutSignal={state.securityTimeoutSignal}
          securityTimeoutOptions={state.securityTimeoutOptions}
          securityTimeoutLabel={state.securityTimeoutLabel}
          securityActionSignal={state.securityActionSignal}
          securityActionOptions={state.securityActionOptions}
          securityActionLabel={state.securityActionLabel}
          securityNeverSelected={state.securityNeverSelected()}
          onSecuritySave={state.lockPolicySave}
          autofillPageLoadSignal={state.autofillPageLoadSignal}
          autofillOptions={state.autofillOptions}
          autofillLabel={state.autofillLabel}
          autofillSiteAvailable={state.siteFilterAvailable()}
          autofillSiteLabel={state.siteLabel()}
          autofillSiteDisabled={state.autofillSiteDisabled()}
          autofillSaveStatus={state.autofillSaveStatus()}
          onAutofillSiteToggle={state.autofillSiteToggle}
          onAutofillSave={state.autofillPolicySave}
        />
      </Show>

      <Show when={state.isGeneratorPane()}>
        <Show
          when={p.generatorPreferencesLoaded?.() ?? true}
          fallback={
            <div role="status" aria-label="Loading generator preferences" class="flex justify-center py-10">
              <LoaderShuffle4Dots />
            </div>
          }
        >
          <ExtensionFullWindowGeneratorPane
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

      <Show when={state.isVaultPane()}>
        <Show when={state.isLoading()}>
          <div role="status" aria-label="Loading vault" class="flex justify-center py-10">
            <LoaderShuffle4Dots />
          </div>
        </Show>

        <Show when={state.isLoggedOut()}>
          <section class="flex max-w-md flex-col gap-2 py-6">
            <p class="text-sm">Sign in to open your vault.</p>
            <InputS
              type="email"
              aria-label="Email address"
              placeholder="Email address"
              valueSignal={state.emailSignal}
            />
            <InputS
              type="password"
              aria-label="Master password"
              placeholder="Master password"
              valueSignal={state.masterPasswordSignal}
            />
            <Button variant="filledBlue" disabled={state.busy()} onClick={state.accountLogin}>
              Log in
            </Button>
          </section>
        </Show>

        <Show when={state.isLocked()}>
          <section class="flex max-w-md flex-col gap-2 py-6">
            <p class="text-sm">Your vault is locked.</p>
            <InputS
              type="password"
              aria-label="Master password"
              placeholder="Master password"
              valueSignal={state.masterPasswordSignal}
            />
            <Button variant="filledBlue" disabled={state.busy()} onClick={state.vaultUnlock}>
              Unlock
            </Button>
          </section>
        </Show>

        <Show when={state.isError()}>
          <section role="alert" class="flex max-w-md flex-col gap-2 py-6">
            <p class="text-sm text-red-600 dark:text-red-400">{state.errorMessage() ?? "Something went wrong."}</p>
            <Button variant="outline" disabled={state.busy()} onClick={state.vaultSync}>
              Retry
            </Button>
          </section>
        </Show>

        <Show when={state.isReady()}>
          <Show
            when={p.vaultSortLoaded?.() ?? true}
            fallback={
              <div role="status" aria-label="Loading vault preferences" class="flex justify-center py-10">
                <LoaderShuffle4Dots />
              </div>
            }
          >
            <div class="flex flex-col gap-4 md:flex-row md:items-start">
              <ExtensionFullWindowResourceNavigation resourceState={state.resourceState} idPrefix={p.idPrefix} />
              <div class="min-w-0 grow">
                <nav class="mb-4 flex flex-wrap gap-1" aria-label="Vault item types">
                  <Button
                    variant={state.isLoginCategory() ? "filledBlue" : "ghost"}
                    size="sm"
                    aria-current={state.isLoginCategory() ? "page" : undefined}
                    onClick={state.loginCategoryOpen}
                  >
                    Logins
                  </Button>
                  <Button
                    variant={state.isSecureNoteCategory() ? "filledBlue" : "ghost"}
                    size="sm"
                    aria-current={state.isSecureNoteCategory() ? "page" : undefined}
                    onClick={state.secureNoteCategoryOpen}
                  >
                    Secure notes
                  </Button>
                  <Button
                    variant={state.isCardCategory() ? "filledBlue" : "ghost"}
                    size="sm"
                    aria-current={state.isCardCategory() ? "page" : undefined}
                    onClick={state.cardCategoryOpen}
                  >
                    Cards
                  </Button>
                  <Button
                    variant={state.isIdentityCategory() ? "filledBlue" : "ghost"}
                    size="sm"
                    aria-current={state.isIdentityCategory() ? "page" : undefined}
                    onClick={state.identityCategoryOpen}
                  >
                    Identities
                  </Button>
                  <Button
                    variant={state.isSshKeyCategory() ? "filledBlue" : "ghost"}
                    size="sm"
                    aria-current={state.isSshKeyCategory() ? "page" : undefined}
                    onClick={state.sshKeyCategoryOpen}
                  >
                    SSH keys
                  </Button>
                </nav>
                <Show when={state.isSecureNoteCategory()}>
                  <ExtensionFullWindowSecureNotePane
                    model={state.resourceFilteredModel}
                    commands={p.commands}
                    idPrefix={p.idPrefix}
                  />
                </Show>
                <Show when={state.isCardCategory()}>
                  <ExtensionFullWindowCardPane
                    model={state.resourceFilteredModel}
                    commands={p.commands}
                    idPrefix={p.idPrefix}
                  />
                </Show>
                <Show when={state.isIdentityCategory()}>
                  <ExtensionFullWindowIdentityPane
                    model={state.resourceFilteredModel}
                    commands={p.commands}
                    idPrefix={p.idPrefix}
                  />
                </Show>
                <Show when={state.isSshKeyCategory()}>
                  <ExtensionFullWindowSshKeyPane
                    model={state.resourceFilteredModel}
                    commands={p.commands}
                    idPrefix={p.idPrefix}
                  />
                </Show>
                <Show when={state.isLoginCategory()}>
                  <div class="flex flex-col gap-4 md:flex-row md:items-start">
                    <section aria-label="Logins" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
                      <InputS
                        type="search"
                        aria-label="Search logins"
                        placeholder="Search logins"
                        valueSignal={state.searchQuerySignal}
                      />

                      <div class="flex flex-col gap-1">
                        <Label for={`${p.idPrefix ?? ""}extension-vault-sort`}>Sort logins</Label>
                        <SelectSingleNative
                          id={`${p.idPrefix ?? ""}extension-vault-sort`}
                          disabled={state.busy()}
                          valueSignal={state.vaultSortSignal}
                          getOptions={state.vaultSortOptionValues}
                          valueText={state.vaultSortLabel}
                        />
                      </div>

                      <Show when={state.siteFilterAvailable()}>
                        <Button
                          variant={state.siteOnly() ? "filledBlue" : "outline"}
                          size="sm"
                          aria-pressed={state.siteOnly() ? "true" : "false"}
                          onClick={state.siteOnlyToggle}
                        >
                          Only this site
                        </Button>
                      </Show>

                      <Show when={state.errorMessage()}>
                        {(message) => (
                          <p role="alert" class="text-xs text-red-600 dark:text-red-400">
                            {message()}
                          </p>
                        )}
                      </Show>

                      <Show
                        when={!state.isEmpty()}
                        fallback={
                          <p class="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                            {state.hasNoLogins() ? "Your vault is empty." : "No logins match your filters."}
                          </p>
                        }
                      >
                        <ul class="flex list-none flex-col gap-1">
                          <For each={state.visibleLogins()}>
                            {(login) => (
                              <li>
                                <ExtensionFullWindowLoginRow
                                  login={login}
                                  selected={state.selectedLogin()?.id === login.id}
                                  onSelect={state.loginSelect}
                                />
                              </li>
                            )}
                          </For>
                        </ul>
                      </Show>
                    </section>

                    <section aria-label="Login details" class="min-w-0 grow">
                      <Show
                        when={state.selectedLogin()}
                        fallback={
                          <p class="py-6 text-sm text-slate-600 dark:text-slate-300">
                            Select a login to see its details.
                          </p>
                        }
                      >
                        {(login) => (
                          <ExtensionFullWindowLoginDetail
                            login={login()}
                            cipher={state.selectedLoginCipher}
                            detailLoading={state.loginDetailLoading()}
                            disabled={state.busy()}
                            fillAvailable={state.fillAvailable()}
                            fieldIsCopied={state.fieldIsCopied}
                            onFill={state.loginFill}
                            onCopy={state.fieldCopy}
                            totpIsCopied={state.totpIsCopied}
                            onTotpCopy={state.totpCopy}
                            onEdit={state.loginEdit}
                            onClose={state.loginDeselect}
                            model={p.model}
                            commands={p.commands}
                            idPrefix={p.idPrefix}
                          />
                        )}
                      </Show>
                    </section>
                  </div>
                </Show>
              </div>
            </div>
          </Show>
        </Show>
      </Show>
    </Dynamic>
  )
}
