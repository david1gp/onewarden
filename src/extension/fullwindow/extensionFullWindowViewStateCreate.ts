import { createEffect, createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowCopyableField } from "./ExtensionFullWindowCopyableField.js"
import { extensionFullWindowCreateStatus } from "./ExtensionFullWindowCreateStatus.js"
import { extensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowLogin } from "./ExtensionFullWindowLogin.js"
import { extensionFullWindowPane } from "./ExtensionFullWindowPane.js"
import { extensionFullWindowRegion } from "./ExtensionFullWindowRegion.js"
import { extensionFullWindowStatus } from "./ExtensionFullWindowStatus.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "./extensionFullWindowEnvironmentSettingsCreate.js"
import { extensionFullWindowLoginSearchMatch } from "./extensionFullWindowLoginSearchMatch.js"
import { extensionFullWindowLoginUriMatch } from "./extensionFullWindowLoginUriMatch.js"
import { extensionFullWindowUrlSignalCreate } from "./extensionFullWindowUrlSignalCreate.js"

const regionLabels: Record<string, string> = {
  us: "Bitwarden US",
  eu: "Bitwarden EU",
  selfHosted: "Self-hosted",
}

/** Component-local view state and command glue for the full-window vault. */
export function extensionFullWindowViewStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
) {
  const searchQuerySignal = extensionFullWindowUrlSignalCreate("q")
  const selectedLoginIdSignal = extensionFullWindowUrlSignalCreate("login")
  const paneSignal = extensionFullWindowUrlSignalCreate("pane", extensionFullWindowPane.vault)
  const siteOnlySignal = extensionFullWindowUrlSignalCreate("site")
  const emailSignal = createSignalObject("")
  const masterPasswordSignal = createSignalObject("")

  const environmentSignal = createSignalObject(extensionFullWindowEnvironmentSettingsCreate())
  const environmentTouchedSignal = createSignalObject(false)

  const status = createMemo(() => model().status)
  const hostname = createMemo(() => model().hostname)
  const errorMessage = createMemo(() => model().errorMessage)
  const busy = createMemo(() => model().busy)
  const environmentSaveStatus = createMemo(() => model().environmentSaveStatus)
  const environmentSaveErrorMessage = createMemo(() =>
    environmentSaveStatus() === extensionFullWindowEnvironmentSaveStatus.error ? errorMessage() : null,
  )
  const fillAvailable = createMemo(() => model().fillAvailable)

  const isLoading = createMemo(() => status() === extensionFullWindowStatus.loading)
  const isLocked = createMemo(() => status() === extensionFullWindowStatus.locked)
  const isLoggedOut = createMemo(() => status() === extensionFullWindowStatus.loggedOut)
  const isError = createMemo(() => status() === extensionFullWindowStatus.error)
  const isReady = createMemo(() => status() === extensionFullWindowStatus.ready)

  const isSettingsPane = createMemo(() => paneSignal.get() === extensionFullWindowPane.settings)
  const isCreatePane = createMemo(() => paneSignal.get() === extensionFullWindowPane.create)
  const isVaultPane = createMemo(() => !isSettingsPane() && !isCreatePane())

  const createStatus = createMemo(() => model().createStatus)
  const createErrorMessage = createMemo(() =>
    model().createStatus === extensionFullWindowCreateStatus.error ? model().errorMessage : null,
  )
  const createPrefill = createMemo(() => {
    const prefill = model().createPrefill
    if (prefill.name !== "" || prefill.uri !== "") return prefill
    const activeHostname = hostname()
    if (activeHostname === null) return prefill
    return { name: activeHostname, uri: `https://${activeHostname}` }
  })

  const siteOnly = createMemo(() => siteOnlySignal.get() === "1")
  const siteFilterAvailable = createMemo(() => hostname() !== null)
  const siteLabel = createMemo(() => hostname() ?? "No active site")

  const visibleLogins = createMemo(() =>
    model()
      .logins.filter((login) => !siteOnly() || extensionFullWindowLoginUriMatch(login, hostname()))
      .filter((login) => extensionFullWindowLoginSearchMatch(login, searchQuerySignal.get())),
  )
  const isEmpty = createMemo(() => isReady() && visibleLogins().length === 0)
  const hasNoLogins = createMemo(() => model().logins.length === 0)

  const selectedLogin = createMemo(
    () => visibleLogins().find((login) => login.id === selectedLoginIdSignal.get()) ?? null,
  )

  const environment = createMemo(() => (environmentTouchedSignal.get() ? environmentSignal.get() : model().environment))
  const regionSignal = {
    get: () => environment().region as string,
    set: (region: string) => environmentFieldSet("region", region),
  }
  const isSelfHosted = createMemo(() => environment().region === extensionFullWindowRegion.selfHosted)
  const regionOptions = () => Object.keys(extensionFullWindowRegion)
  const regionLabel = (region: string) => regionLabels[region] ?? region

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

  const fieldIsCopied = (field: ExtensionFullWindowCopyableField) => model().copiedFieldKey === field.key
  const totpIsCopied = (login: ExtensionFullWindowLogin) => model().copiedFieldKey === `totp:${login.id}`

  const loginSelect = (login: ExtensionFullWindowLogin) => selectedLoginIdSignal.set(login.id)
  const loginDeselect = () => selectedLoginIdSignal.set("")
  const vaultPaneOpen = () => paneSignal.set(extensionFullWindowPane.vault)
  const createPaneOpen = () => paneSignal.set(extensionFullWindowPane.create)
  const settingsPaneOpen = () => paneSignal.set(extensionFullWindowPane.settings)
  const siteOnlyToggle = () => siteOnlySignal.set(siteOnly() ? "" : "1")

  const loginFill = (login: ExtensionFullWindowLogin) => commands().loginFill(login)
  const fieldCopy = (login: ExtensionFullWindowLogin, field: ExtensionFullWindowCopyableField) =>
    commands().fieldCopy(login, field)
  const totpCopy = (login: ExtensionFullWindowLogin) => commands().totpCopy(login)
  const loginAdd = () => {
    createPaneOpen()
    commands().loginAdd()
  }
  const loginCreate = (request: ExtensionCreateLoginRequest) => commands().loginCreate(request)
  const loginDraftSave = (request: ExtensionCreateLoginRequest) => commands().loginDraftSave(request)
  const loginDraftDiscard = (draftId: string) => commands().loginDraftDiscard(draftId)
  const createCancel = () => vaultPaneOpen()

  createEffect(() => {
    if (!isCreatePane()) return
    if (createStatus() !== extensionFullWindowCreateStatus.saved) return
    const createdId = model().createdLoginId
    vaultPaneOpen()
    if (createdId !== null) selectedLoginIdSignal.set(createdId)
  })
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

  const vaultUnlock = () => {
    const masterPassword = masterPasswordSignal.get()
    if (masterPassword === "") return
    masterPasswordSignal.set("")
    commands().vaultUnlock(masterPassword)
  }

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
    errorMessage,
    environmentSaveStatus,
    environmentSaveErrorMessage,
    busy,
    fillAvailable,
    isLoading,
    isLocked,
    isLoggedOut,
    isError,
    isReady,
    isEmpty,
    hasNoLogins,
    isVaultPane,
    isSettingsPane,
    isCreatePane,
    createStatus,
    createErrorMessage,
    createPrefill,
    vaultPaneOpen,
    createPaneOpen,
    settingsPaneOpen,
    visibleLogins,
    selectedLogin,
    loginSelect,
    loginDeselect,
    fieldIsCopied,
    totpIsCopied,
    loginFill,
    fieldCopy,
    totpCopy,
    loginAdd,
    loginCreate,
    loginDraftSave,
    loginDraftDiscard,
    createCancel,
    vaultSync,
    vaultLock,
    vaultLogout,
    vaultUnlock,
    accountLogin,
    environmentSave,
  }
}
