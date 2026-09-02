import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import { extensionVaultStatusStateCreate } from "../extensionVaultStatusStateCreate.js"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import { extensionPopupStatus } from "./ExtensionPopupStatus.js"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"
import { extensionPopupLoginSearchMatch } from "./extensionPopupLoginSearchMatch.js"

/** Component-local view state and command glue for the popup vault view. */
export function extensionPopupViewStateCreate(
  model: () => ExtensionPopupViewModel,
  commands: () => ExtensionPopupCommands,
) {
  const searchQuerySignal = createSignalObject("")
  const masterPasswordSignal = createSignalObject("")

  const status = createMemo(() => model().status)
  const hostname = createMemo(() => model().hostname)
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

  const siteLabel = createMemo(() => hostname() ?? "No active site")

  const biometricAvailable = createMemo(() => model().biometricStatus?.capability.status === "available")
  const biometricEnrolled = createMemo(() => model().biometricStatus?.enrolled ?? false)

  const fieldIsCopied = (field: ExtensionCopyableField) => model().copiedFieldKey === field.key
  const totpIsCopied = (login: ExtensionLogin) => model().copiedFieldKey === `totp:${login.id}`

  const loginFill = (login: ExtensionLogin) => commands().loginFill(login)
  const fieldCopy = (login: ExtensionLogin, field: ExtensionCopyableField) => commands().fieldCopy(login, field)
  const totpCopy = (login: ExtensionLogin) => commands().totpCopy(login)
  const loginAdd = () => commands().loginAdd()
  const vaultSync = () => commands().vaultSync()
  const vaultLock = () => commands().vaultLock()
  const vaultLogout = () => commands().vaultLogout()
  const fullVaultOpen = () => commands().fullVaultOpen()
  const generatorOpen = () => commands().generatorOpen()
  const settingsOpen = () => commands().settingsOpen()
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
    hostname,
    siteLabel,
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
    fullVaultOpen,
    generatorOpen,
    settingsOpen,
    vaultUnlock,
    biometricAvailable,
    biometricEnrolled,
    biometricUnlock,
    accountLogin,
    accountRegister,
  }
}
