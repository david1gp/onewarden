import { createMemo } from "solid-js"
import * as v from "valibot"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { vaultSortApply } from "../../shared/vault/vaultSortApply.js"
import { vaultSortDefault } from "../../shared/vault/vaultSortDefault.js"
import { vaultSortOptions } from "../../shared/vault/vaultSortOptions.js"
import type { VaultSort } from "../../shared/vault/vaultSortSchema.js"
import { vaultSortSchema } from "../../shared/vault/vaultSortSchema.js"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import { extensionVaultStatusStateCreate } from "../extensionVaultStatusStateCreate.js"
import type { ExtensionAutofillPolicy } from "../storage/extensionAutofillPolicySchema.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import { extensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import { extensionFullWindowPane } from "./ExtensionFullWindowPane.js"
import { extensionFullWindowRegion } from "./ExtensionFullWindowRegion.js"
import { extensionFullWindowSecuritySaveStatus } from "./ExtensionFullWindowSecuritySaveStatus.js"
import { extensionFullWindowStatus } from "./ExtensionFullWindowStatus.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "./extensionFullWindowEnvironmentSettingsCreate.js"
import { extensionFullWindowLoginIdSchema } from "./extensionFullWindowLoginIdSchema.js"
import { extensionFullWindowLoginSearchMatch } from "./extensionFullWindowLoginSearchMatch.js"
import { extensionFullWindowLoginUriMatch } from "./extensionFullWindowLoginUriMatch.js"
import { extensionFullWindowPaneSchema } from "./extensionFullWindowPaneSchema.js"
import { extensionFullWindowResourceStateCreate } from "./extensionFullWindowResourceStateCreate.js"
import { extensionFullWindowSiteFilterSchema } from "./extensionFullWindowSiteFilterSchema.js"
import { extensionFullWindowUrlSignalCreate } from "./extensionFullWindowUrlSignalCreate.js"

const regionLabels: Record<string, string> = {
  us: "Bitwarden US",
  eu: "Bitwarden EU",
  selfHosted: "Self-hosted",
}

const defaultLockPolicy: ExtensionLockPolicy = { action: "lock", timeoutMinutes: null }
const defaultAutofillPolicy: ExtensionAutofillPolicy = { pageLoadEnabled: false, disabledSites: [] }
const timeoutOptions = ["1", "5", "15", "30", "60", "240", "never"]
const timeoutLabels: Record<string, string> = {
  "1": "1 minute",
  "5": "5 minutes",
  "15": "15 minutes",
  "30": "30 minutes",
  "60": "1 hour",
  "240": "4 hours",
  never: "Never",
}
const actionOptions = ["lock", "logout"]
const actionLabels: Record<string, string> = { lock: "Lock", logout: "Log out" }

type ExtensionFullWindowViewSortOptions = {
  vaultSort?: () => VaultSort
  onVaultSortChange?: (sort: VaultSort) => void
}

/** Component-local view state and command glue for the full-window vault. */
export function extensionFullWindowViewStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
  initialState?: { pane?: string; selectedLoginId?: string },
  sortOptions: ExtensionFullWindowViewSortOptions = {},
) {
  const searchQuerySignal = extensionFullWindowUrlSignalCreate("q")
  const selectedLoginIdSignal = initialState
    ? createSignalObject(initialState.selectedLoginId ?? "")
    : extensionFullWindowUrlSignalCreate("login", "", extensionFullWindowLoginIdSchema)
  const paneSignal = initialState
    ? createSignalObject(initialState.pane ?? extensionFullWindowPane.vault)
    : extensionFullWindowUrlSignalCreate("pane", extensionFullWindowPane.vault, extensionFullWindowPaneSchema)
  const siteOnlySignal = extensionFullWindowUrlSignalCreate("site", "", extensionFullWindowSiteFilterSchema)
  const vaultCategorySignal = extensionFullWindowUrlSignalCreate("category", "logins")
  const emailSignal = createSignalObject("")
  const masterPasswordSignal = createSignalObject("")
  const localVaultSortSignal = createSignalObject<VaultSort>(vaultSortDefault)
  const resourceState = extensionFullWindowResourceStateCreate(model, commands)
  const resourceFilteredModel = createMemo(() => ({
    ...model(),
    logins: model().logins.filter(resourceState.cipherMatches),
    secureNotes: model().secureNotes.filter(resourceState.cipherMatches),
    cards: model().cards.filter(resourceState.cipherMatches),
    identities: model().identities.filter(resourceState.cipherMatches),
    sshKeys: model().sshKeys.filter(resourceState.cipherMatches),
  }))

  const environmentSignal = createSignalObject(extensionFullWindowEnvironmentSettingsCreate())
  const environmentTouchedSignal = createSignalObject(false)
  const securitySignal = createSignalObject<ExtensionLockPolicy>(defaultLockPolicy)
  const securityTouchedSignal = createSignalObject(false)
  const autofillSignal = createSignalObject<ExtensionAutofillPolicy>(defaultAutofillPolicy)
  const autofillTouchedSignal = createSignalObject(false)

  const status = createMemo(() => model().status)
  const hostname = createMemo(() => model().hostname)
  const errorMessage = createMemo(() => model().errorMessage)
  const busy = createMemo(() => model().busy)
  const environmentSaveStatus = createMemo(() => model().environmentSaveStatus)
  const environmentSaveErrorMessage = createMemo(() =>
    environmentSaveStatus() === extensionFullWindowEnvironmentSaveStatus.error ? errorMessage() : null,
  )
  const fillAvailable = createMemo(() => model().fillAvailable)
  const lockPolicy = createMemo(() => model().lockPolicy)
  const autofillPolicy = createMemo(() =>
    autofillTouchedSignal.get() ? autofillSignal.get() : (model().autofillPolicy ?? defaultAutofillPolicy),
  )

  const isSettingsPane = createMemo(() => paneSignal.get() === extensionFullWindowPane.settings)
  const isGeneratorPane = createMemo(() => paneSignal.get() === extensionFullWindowPane.generator)
  const isVaultPane = createMemo(() => !isGeneratorPane() && !isSettingsPane())
  const isLoginCategory = createMemo(
    () => !["notes", "cards", "identities", "ssh-keys"].includes(vaultCategorySignal.get()),
  )
  const isSecureNoteCategory = createMemo(() => vaultCategorySignal.get() === "notes")
  const isCardCategory = createMemo(() => vaultCategorySignal.get() === "cards")
  const isIdentityCategory = createMemo(() => vaultCategorySignal.get() === "identities")
  const isSshKeyCategory = createMemo(() => vaultCategorySignal.get() === "ssh-keys")

  const siteOnly = createMemo(() => siteOnlySignal.get() === "1")
  const siteFilterAvailable = createMemo(() => hostname() !== null)
  const siteLabel = createMemo(() => hostname() ?? "No active site")
  const vaultSort = createMemo(() => sortOptions.vaultSort?.() ?? localVaultSortSignal.get())
  const vaultSortSet = (value: string): void => {
    const parsed = v.safeParse(vaultSortSchema, value)
    if (!parsed.success) return
    localVaultSortSignal.set(parsed.output)
    sortOptions.onVaultSortChange?.(parsed.output)
  }
  const vaultSortSignal: SignalObject<string> = { get: vaultSort, set: vaultSortSet }
  const vaultSortOptionValues = () => vaultSortOptions.map((option) => option.value)
  const vaultSortLabel = (value: string) => vaultSortOptions.find((option) => option.value === value)?.label ?? value
  const visibleLogins = createMemo(() => {
    const filteredLogins = resourceFilteredModel()
      .logins.filter((login) => !siteOnly() || extensionFullWindowLoginUriMatch(login, hostname()))
      .filter((login) => extensionFullWindowLoginSearchMatch(login, searchQuerySignal.get()))
    return vaultSortApply(filteredLogins, vaultSort())
  })
  const { isLoading, isLocked, isLoggedOut, isError, isReady, isEmpty, hasNoLogins } = extensionVaultStatusStateCreate(
    status,
    extensionFullWindowStatus,
    visibleLogins,
    () => model().logins,
  )

  const securitySaveStatus = createMemo(() => model().securitySaveStatus)
  const securityErrorMessage = createMemo(() => {
    if (securitySaveStatus() === extensionFullWindowSecuritySaveStatus.error || isError()) return errorMessage()
    return null
  })
  const securitySettingsLoading = createMemo(() => isLoading())
  const securitySettingsAvailable = createMemo(() => !isLoading() && !isError())
  const securityPolicy = createMemo(() =>
    securityTouchedSignal.get() ? securitySignal.get() : (lockPolicy() ?? defaultLockPolicy),
  )

  const selectedLogin = createMemo(
    () => visibleLogins().find((login) => login.id === selectedLoginIdSignal.get()) ?? null,
  )
  const selectedLoginCipher = createMemo(() => {
    const cipher = model().selectedLoginCipher
    return cipher?.id === selectedLoginIdSignal.get() ? cipher : null
  })

  const environment = createMemo(() => (environmentTouchedSignal.get() ? environmentSignal.get() : model().environment))
  const regionSignal = {
    get: () => environment().region as string,
    set: (region: string) => environmentFieldSet("region", region),
  }
  const isSelfHosted = createMemo(() => environment().region === extensionFullWindowRegion.selfHosted)
  const regionOptions = () => Object.keys(extensionFullWindowRegion)
  const regionLabel = (region: string) => regionLabels[region] ?? region

  const securityTimeoutSignal = {
    get: () => securityPolicy().timeoutMinutes?.toString() ?? "never",
    set: (value: string) => {
      securitySignal.set({
        ...securityPolicy(),
        timeoutMinutes: value === "never" ? null : Number(value),
      })
      securityTouchedSignal.set(true)
    },
  }
  const securityActionSignal = {
    get: () => securityPolicy().action,
    set: (value: string) => {
      if (value !== "lock" && value !== "logout") return
      securitySignal.set({ ...securityPolicy(), action: value })
      securityTouchedSignal.set(true)
    },
  }
  const securityTimeoutOptions = () => timeoutOptions
  const securityTimeoutLabel = (value: string) => timeoutLabels[value] ?? value
  const securityActionOptions = () => actionOptions
  const securityActionLabel = (value: string) => actionLabels[value] ?? value
  const securityNeverSelected = createMemo(() => securityPolicy().timeoutMinutes === null)
  const autofillPageLoadSignal: SignalObject<string> = {
    get: () => (autofillPolicy().pageLoadEnabled ? "enabled" : "disabled"),
    set: (value) => {
      if (value !== "enabled" && value !== "disabled") return
      autofillSignal.set({ ...autofillPolicy(), pageLoadEnabled: value === "enabled" })
      autofillTouchedSignal.set(true)
    },
  }
  const autofillOptions = () => ["disabled", "enabled"]
  const autofillLabel = (value: string) => (value === "enabled" ? "On" : "Off")
  const autofillSiteDisabled = createMemo(() => {
    const site = hostname()
      ?.toLowerCase()
      .replace(/^www\./, "")
    return site !== undefined && autofillPolicy().disabledSites.includes(site)
  })
  const autofillSiteToggle = () => {
    const site = hostname()
      ?.toLowerCase()
      .replace(/^www\./, "")
    if (site === undefined) return
    const disabledSites = autofillSiteDisabled()
      ? autofillPolicy().disabledSites.filter((entry) => entry !== site)
      : [...autofillPolicy().disabledSites, site]
    autofillSignal.set({ ...autofillPolicy(), disabledSites })
    autofillTouchedSignal.set(true)
  }

  const environmentFieldSignal = (
    field: "base" | "webVault" | "api" | "identity" | "icons" | "notifications" | "events",
  ) => ({
    get: () => environment()[field],
    set: (value: string) => environmentFieldSet(field, value),
  })

  function environmentFieldSet(field: string, value: string): void {
    environmentSignal.set({ ...environment(), [field]: value })
    environmentTouchedSignal.set(true)
  }

  const fieldIsCopied = (field: ExtensionCopyableField) => model().copiedFieldKey === field.key
  const totpIsCopied = (login: ExtensionLogin) => model().copiedFieldKey === `totp:${login.id}`

  const loginSelect = (login: ExtensionLogin) => {
    selectedLoginIdSignal.set(login.id)
    commands().loginRead(login.id)
  }
  const loginDeselect = () => selectedLoginIdSignal.set("")
  const vaultPaneOpen = () => paneSignal.set(extensionFullWindowPane.vault)
  const generatorPaneOpen = () => paneSignal.set(extensionFullWindowPane.generator)
  const settingsPaneOpen = () => paneSignal.set(extensionFullWindowPane.settings)
  const loginCategoryOpen = () => vaultCategorySignal.set("logins")
  const secureNoteCategoryOpen = () => vaultCategorySignal.set("notes")
  const cardCategoryOpen = () => vaultCategorySignal.set("cards")
  const identityCategoryOpen = () => vaultCategorySignal.set("identities")
  const sshKeyCategoryOpen = () => vaultCategorySignal.set("ssh-keys")
  const siteOnlyToggle = () => siteOnlySignal.set(siteOnly() ? "" : "1")

  const loginFill = (login: ExtensionLogin) => commands().loginFill(login)
  const fieldCopy = (login: ExtensionLogin, field: ExtensionCopyableField) => commands().fieldCopy(login, field)
  const totpCopy = (login: ExtensionLogin) => commands().totpCopy(login)
  const loginAdd = () => commands().loginAdd()
  const loginEdit = (login: ExtensionLogin) => commands().loginEdit(login)
  const vaultSync = () => commands().vaultSync()
  const vaultLock = () => commands().vaultLock()
  const vaultLogout = () => commands().vaultLogout()
  const accountLogin = () => {
    const email = emailSignal.get().trim()
    const password = masterPasswordSignal.get()
    if (email === "" || password === "") {
      commands().accountLogin()
      return
    }
    masterPasswordSignal.set("")
    commands().accountLogin({ email, password }, environment())
  }
  const environmentSave = () => commands().environmentSave(environment())
  const lockPolicySave = () => commands().lockPolicySave(securityPolicy())
  const autofillPolicySave = () => commands().autofillPolicySave?.(autofillPolicy())

  const vaultUnlock = () => {
    const masterPassword = masterPasswordSignal.get()
    if (masterPassword === "") return
    masterPasswordSignal.set("")
    commands().vaultUnlock(masterPassword)
  }
  if (selectedLoginIdSignal.get() !== "") commands().loginRead(selectedLoginIdSignal.get())

  return {
    searchQuerySignal,
    emailSignal,
    masterPasswordSignal,
    regionSignal,
    environmentFieldSignal,
    regionOptions,
    regionLabel,
    isSelfHosted,
    hostname,
    siteLabel,
    siteOnly,
    siteFilterAvailable,
    siteOnlyToggle,
    vaultSortSignal,
    vaultSortOptionValues,
    vaultSortLabel,
    errorMessage,
    environmentSaveStatus,
    environmentSaveErrorMessage,
    busy,
    fillAvailable,
    lockPolicy,
    securitySaveStatus,
    securityErrorMessage,
    securitySettingsLoading,
    securitySettingsAvailable,
    securityTimeoutSignal,
    securityTimeoutOptions,
    securityTimeoutLabel,
    securityActionSignal,
    securityActionOptions,
    securityActionLabel,
    securityNeverSelected,
    autofillPageLoadSignal,
    autofillOptions,
    autofillLabel,
    autofillSiteDisabled,
    autofillSiteToggle,
    autofillSaveStatus: () => model().autofillSaveStatus,
    isLoading,
    isLocked,
    isLoggedOut,
    isError,
    isReady,
    isEmpty,
    hasNoLogins,
    isVaultPane,
    isLoginCategory,
    isSecureNoteCategory,
    isCardCategory,
    isIdentityCategory,
    isSshKeyCategory,
    isGeneratorPane,
    isSettingsPane,
    vaultPaneOpen,
    generatorPaneOpen,
    settingsPaneOpen,
    loginCategoryOpen,
    secureNoteCategoryOpen,
    cardCategoryOpen,
    identityCategoryOpen,
    sshKeyCategoryOpen,
    visibleLogins,
    selectedLogin,
    selectedLoginCipher,
    loginDetailLoading: () => model().loginDetailLoading,
    loginSelect,
    loginDeselect,
    fieldIsCopied,
    totpIsCopied,
    loginFill,
    fieldCopy,
    totpCopy,
    loginAdd,
    loginEdit,
    vaultSync,
    vaultLock,
    vaultLogout,
    vaultUnlock,
    accountLogin,
    environmentSave,
    lockPolicySave,
    autofillPolicySave,
    resourceState,
    resourceFilteredModel,
  }
}
