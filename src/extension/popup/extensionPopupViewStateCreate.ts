import { createEffect, createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import { extensionVaultStatusStateCreate } from "../extensionVaultStatusStateCreate.js"
import { extensionFullWindowPane } from "../fullwindow/ExtensionFullWindowPane.js"
import type { ExtensionPopupPaneStorage } from "../storage/extensionPopupPaneStorageSchema.js"
import { extensionThemeNext } from "../theme/extensionThemeNext.js"
import { extensionThemeSet } from "../theme/extensionThemeSet.js"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import { extensionPopupStatus } from "./ExtensionPopupStatus.js"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"
import { extensionPopupLoginSearchMatch } from "./extensionPopupLoginSearchMatch.js"

/** Component-local view state and command glue for the popup vault view. */
export function extensionPopupViewStateCreate(
  model: () => ExtensionPopupViewModel,
  commands: () => ExtensionPopupCommands,
  themeOptions: {
    theme?: () => "light" | "dark"
    onThemeChange?: (theme: "light" | "dark") => void
    initialPane?: () => ExtensionPopupPaneStorage["pane"]
    initialPaneLoaded?: () => boolean
    onPaneChange?: (pane: ExtensionPopupPaneStorage["pane"]) => void
  } = {},
) {
  const searchQuerySignal = createSignalObject("")
  const masterPasswordSignal = createSignalObject("")
  const localThemeSignal = createSignalObject<"light" | "dark">(
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  )
  const activePaneSignal = createSignalObject<ExtensionPopupPaneStorage["pane"]>(extensionFullWindowPane.vault)
  let initialPaneHydrated = false

  createEffect(() => {
    if (initialPaneHydrated || !(themeOptions.initialPaneLoaded?.() ?? true)) return
    initialPaneHydrated = true
    activePaneSignal.set(themeOptions.initialPane?.() ?? extensionFullWindowPane.vault)
  })

  const status = createMemo(() => model().status)
  const errorMessage = createMemo(() => model().errorMessage)
  const busy = createMemo(() => model().busy)
  const fillAvailable = createMemo(() => model().fillAvailable)

  const visibleLogins = createMemo(() =>
    model().logins.filter((login) => extensionPopupLoginSearchMatch(login, searchQuerySignal.get())),
  )
  const { isLoading, isLocked, isLoggedOut, isError, isReady, isEmpty, hasNoLogins } = extensionVaultStatusStateCreate(
    status,
    extensionPopupStatus,
    visibleLogins,
    () => model().logins,
  )

  const biometricAvailable = createMemo(() => model().biometricStatus?.capability.status === "available")
  const biometricEnrolled = createMemo(() => model().biometricStatus?.enrolled ?? false)
  const theme = createMemo(() => themeOptions.theme?.() ?? localThemeSignal.get())
  const themeToggle = (): void => {
    const next = extensionThemeNext(theme())
    if (themeOptions.onThemeChange !== undefined) {
      themeOptions.onThemeChange(next)
      return
    }
    localThemeSignal.set(next)
    void extensionThemeSet(next)
  }

  const fieldIsCopied = (field: ExtensionCopyableField) => model().copiedFieldKey === field.key
  const totpIsCopied = (login: ExtensionLogin) => model().copiedFieldKey === `totp:${login.id}`

  const loginFill = (login: ExtensionLogin) => commands().loginFill(login)
  const fieldCopy = (login: ExtensionLogin, field: ExtensionCopyableField) => commands().fieldCopy(login, field)
  const totpCopy = (login: ExtensionLogin) => commands().totpCopy(login)
  const loginAdd = () => commands().loginAdd()
  const vaultSync = () => commands().vaultSync()
  const vaultLock = () => commands().vaultLock()
  const vaultLogout = () => commands().vaultLogout()
  const isVaultPane = createMemo(() => activePaneSignal.get() === extensionFullWindowPane.vault)
  const isGeneratorPane = createMemo(() => activePaneSignal.get() === extensionFullWindowPane.generator)
  const vaultPaneOpen = () => {
    activePaneSignal.set(extensionFullWindowPane.vault)
    themeOptions.onPaneChange?.(extensionFullWindowPane.vault)
  }
  const generatorPaneOpen = () => {
    activePaneSignal.set(extensionFullWindowPane.generator)
    themeOptions.onPaneChange?.(extensionFullWindowPane.generator)
  }
  const settingsOpen = () => {
    commands().settingsOpen()
  }
  const accountLogin = () => commands().accountLogin()
  const accountRegister = () => commands().accountRegister()
  const biometricUnlock = () => commands().biometricUnlock()

  const vaultUnlock = () => {
    const masterPassword = masterPasswordSignal.get()
    if (masterPassword === "") return
    masterPasswordSignal.set("")
    commands().vaultUnlock(masterPassword)
  }

  return {
    searchQuerySignal,
    masterPasswordSignal,
    errorMessage,
    busy,
    fillAvailable,
    isLoading,
    isLocked,
    isLoggedOut,
    isError,
    isReady,
    isEmpty,
    hasNoLogins,
    visibleLogins,
    fieldIsCopied,
    totpIsCopied,
    loginFill,
    fieldCopy,
    totpCopy,
    loginAdd,
    vaultSync,
    vaultLock,
    vaultLogout,
    vaultPaneOpen,
    generatorPaneOpen,
    fullVaultOpen: () => commands().fullVaultOpen(),
    generatorOpen: () => commands().generatorOpen(),
    settingsOpen,
    isVaultPane,
    isGeneratorPane,
    vaultUnlock,
    biometricAvailable,
    biometricEnrolled,
    biometricUnlock,
    theme,
    themeToggle,
    accountLogin,
    accountRegister,
  }
}
