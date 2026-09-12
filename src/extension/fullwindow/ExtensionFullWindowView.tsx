import { mdiCog } from "@adaptive-ds/mdi/mdiCog.js"
import { mdiKey } from "@adaptive-ds/mdi/mdiKey.js"
import { mdiLock } from "@adaptive-ds/mdi/mdiLock.js"
import { For, type JSX, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import type { VaultSort } from "../../shared/vault/vaultSortSchema.js"
import { ExtensionAccountAuthView } from "../auth/ExtensionAccountAuthView.jsx"
import { ExtensionLoginChallengeView } from "../auth/ExtensionLoginChallengeView.jsx"
import type { ExtensionGeneratorPreferences } from "../storage/extensionGeneratorPreferencesSchema.js"
import { ExtensionBadge } from "../ui/ExtensionBadge.jsx"
import { ExtensionButtonIcon } from "../ui/ExtensionButtonIcon.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { ExtensionSelectSingleNative } from "../ui/ExtensionSelectSingleNative.jsx"
import { ExtensionSeparator } from "../ui/ExtensionSeparator.jsx"
import { ExtensionSeparatorWithText } from "../ui/ExtensionSeparatorWithText.jsx"
import { ExtensionFullWindowCardPane } from "./ExtensionFullWindowCardPane.jsx"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowInitialState } from "./ExtensionFullWindowInitialState.js"
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
  initialState?: ExtensionFullWindowInitialState
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
    <Dynamic component={p.root ?? "main"} class="extension-page-surface flex min-h-dvh flex-col gap-3 p-4 md:p-6">
      <header class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-semibold">OneWarden Vault</h1>
        <ExtensionBadge role="group" aria-label="Active site">
          {state.siteLabel()}
        </ExtensionBadge>
      </header>

      <nav
        aria-label={p.navigationLabel ?? "Extension navigation"}
        class="extension-subtle-surface flex flex-wrap items-center gap-1 rounded-xl p-1"
      >
        <ExtensionButtonIcon
          variant="ghost"
          size="sm"
          icon={mdiLock}
          aria-current={state.isVaultPane() ? "page" : undefined}
          onClick={state.vaultPaneOpen}
          class="extension-selected-control min-h-10"
        >
          Vault
        </ExtensionButtonIcon>
        <ExtensionButtonIcon
          variant="ghost"
          size="sm"
          icon={mdiKey}
          aria-current={state.isGeneratorPane() ? "page" : undefined}
          onClick={state.generatorPaneOpen}
          class="extension-selected-control min-h-10"
        >
          Generator
        </ExtensionButtonIcon>
        <ExtensionButtonIcon
          variant="ghost"
          size="sm"
          icon={mdiCog}
          aria-current={state.isSettingsPane() ? "page" : undefined}
          onClick={state.settingsPaneOpen}
          class="extension-selected-control min-h-10"
        >
          Settings
        </ExtensionButtonIcon>
        <Show when={state.isLoggedOut()}>
          <Button
            variant="ghost"
            size="sm"
            aria-current={state.isAuthPane() ? "page" : undefined}
            onClick={state.authPaneOpen}
            class="extension-selected-control min-h-10"
          >
            Create account
          </Button>
        </Show>
        <Show when={state.isVaultPane()}>
          <span aria-hidden="true" class="extension-boundary mx-1 hidden h-6 border-l sm:block" />
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

      <ExtensionSeparator />

      <Show when={state.isAuthPane() && state.isLoggedOut()}>
        <ExtensionAccountAuthView
          commands={p.commands}
          environment={() => p.model().environment}
          onLogin={state.accountLoginOpen}
          onSettings={state.settingsPaneOpen}
          idPrefix={p.idPrefix}
        />
      </Show>

      <Show when={state.isAuthPane() && !state.isLoggedOut()}>
        <section role="status" class="flex max-w-md flex-col gap-2 py-6">
          <p class="text-sm">Account setup is available after logging out.</p>
          <Button variant="filledBlue" class="extension-primary-control" onClick={state.vaultPaneOpen}>
            Return to vault
          </Button>
        </section>
      </Show>

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
          biometricCapability={state.biometricCapability()}
          biometricEnrolled={state.biometricEnrolled()}
          biometricSaveStatus={state.biometricSaveStatus()}
          biometricErrorMessage={state.biometricErrorMessage()}
          onBiometricEnroll={state.biometricEnroll}
          onBiometricRevoke={state.biometricRevoke}
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
          <Show
            when={state.authChallenge()}
            fallback={
              <section class="flex max-w-md flex-col gap-2 py-6">
                <p class="text-sm">Sign in to open your vault.</p>
                <ExtensionInputS
                  type="email"
                  aria-label="Email address"
                  placeholder="Email address"
                  disabled={state.busy()}
                  valueSignal={state.emailSignal}
                />
                <ExtensionInputS
                  type="password"
                  aria-label="Master password"
                  placeholder="Master password"
                  disabled={state.busy()}
                  valueSignal={state.masterPasswordSignal}
                />
                <Button
                  variant="filledBlue"
                  class="extension-primary-control"
                  disabled={state.busy()}
                  onClick={state.accountLogin}
                >
                  Log in
                </Button>
              </section>
            }
          >
            {(challenge) => (
              <ExtensionLoginChallengeView
                challenge={challenge}
                commands={p.commands}
                busy={state.busy}
                errorMessage={state.errorMessage}
                statusMessage={state.authMessage}
                idPrefix={p.idPrefix}
              />
            )}
          </Show>
        </Show>

        <Show when={state.isLocked()}>
          <Show
            when={state.authChallenge()}
            fallback={
              <section class="flex max-w-md flex-col gap-3 py-6" aria-label="Unlock vault">
                <p class="text-sm">Your vault is locked.</p>
                <Show when={state.biometricAvailable() && state.biometricEnrolled()}>
                  <Button
                    variant="filledBlue"
                    class="extension-primary-control"
                    disabled={state.busy()}
                    onClick={state.biometricUnlock}
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
                  disabled={state.busy()}
                  valueSignal={state.masterPasswordSignal}
                />
                <Button
                  variant={state.biometricAvailable() && state.biometricEnrolled() ? "outline" : "filledBlue"}
                  class={
                    state.biometricAvailable() && state.biometricEnrolled() ? undefined : "extension-primary-control"
                  }
                  disabled={state.busy()}
                  onClick={state.vaultUnlock}
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
            }
          >
            {(challenge) => (
              <ExtensionLoginChallengeView
                challenge={challenge}
                commands={p.commands}
                busy={state.busy}
                errorMessage={state.errorMessage}
                statusMessage={state.authMessage}
                idPrefix={p.idPrefix}
              />
            )}
          </Show>
        </Show>

        <Show when={state.isError()}>
          <section role="alert" class="flex max-w-md flex-col gap-2 py-6">
            <p class="extension-error-text text-sm">{state.errorMessage() ?? "Something went wrong."}</p>
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
                    variant="ghost"
                    class="extension-selected-control"
                    size="sm"
                    aria-current={state.isLoginCategory() ? "page" : undefined}
                    onClick={state.loginCategoryOpen}
                  >
                    Logins
                  </Button>
                  <Button
                    variant="ghost"
                    class="extension-selected-control"
                    size="sm"
                    aria-current={state.isSecureNoteCategory() ? "page" : undefined}
                    onClick={state.secureNoteCategoryOpen}
                  >
                    Secure notes
                  </Button>
                  <Button
                    variant="ghost"
                    class="extension-selected-control"
                    size="sm"
                    aria-current={state.isCardCategory() ? "page" : undefined}
                    onClick={state.cardCategoryOpen}
                  >
                    Cards
                  </Button>
                  <Button
                    variant="ghost"
                    class="extension-selected-control"
                    size="sm"
                    aria-current={state.isIdentityCategory() ? "page" : undefined}
                    onClick={state.identityCategoryOpen}
                  >
                    Identities
                  </Button>
                  <Button
                    variant="ghost"
                    class="extension-selected-control"
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
                    initialState={p.initialState}
                  />
                </Show>
                <Show when={state.isCardCategory()}>
                  <ExtensionFullWindowCardPane
                    model={state.resourceFilteredModel}
                    commands={p.commands}
                    idPrefix={p.idPrefix}
                    initialState={p.initialState}
                  />
                </Show>
                <Show when={state.isIdentityCategory()}>
                  <ExtensionFullWindowIdentityPane
                    model={state.resourceFilteredModel}
                    commands={p.commands}
                    idPrefix={p.idPrefix}
                    initialState={p.initialState}
                  />
                </Show>
                <Show when={state.isSshKeyCategory()}>
                  <ExtensionFullWindowSshKeyPane
                    model={state.resourceFilteredModel}
                    commands={p.commands}
                    idPrefix={p.idPrefix}
                    initialState={p.initialState}
                  />
                </Show>
                <Show when={state.isLoginCategory()}>
                  <div class="flex flex-col gap-4 md:flex-row md:items-start">
                    <section aria-label="Logins" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
                      <ExtensionInputS
                        type="search"
                        aria-label="Search logins"
                        placeholder="Search logins"
                        disabled={state.busy()}
                        valueSignal={state.searchQuerySignal}
                      />

                      <div class="flex flex-col gap-1">
                        <Label for={`${p.idPrefix ?? ""}extension-vault-sort`}>Sort logins</Label>
                        <ExtensionSelectSingleNative
                          id={`${p.idPrefix ?? ""}extension-vault-sort`}
                          disabled={state.busy()}
                          valueSignal={state.vaultSortSignal}
                          getOptions={state.vaultSortOptionValues}
                          valueText={state.vaultSortLabel}
                        />
                      </div>

                      <Show when={state.siteFilterAvailable()}>
                        <Button
                          variant="outline"
                          class="extension-selected-control"
                          size="sm"
                          aria-pressed={state.siteOnly() ? "true" : "false"}
                          onClick={state.siteOnlyToggle}
                        >
                          Only this site
                        </Button>
                      </Show>

                      <Show when={state.errorMessage()}>
                        {(message) => (
                          <p role="alert" class="extension-error-text text-xs">
                            {message()}
                          </p>
                        )}
                      </Show>

                      <Show
                        when={!state.isEmpty()}
                        fallback={
                          <p class="extension-muted-text py-6 text-center text-sm">
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
                        fallback={<p class="extension-muted-text py-6 text-sm">Select a login to see its details.</p>}
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
                            initialState={p.initialState}
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
