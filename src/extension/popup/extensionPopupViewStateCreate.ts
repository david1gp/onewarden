import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionPopupCommands } from "./ExtensionPopupCommands.js"
import type { ExtensionPopupCopyableField } from "./ExtensionPopupCopyableField.js"
import type { ExtensionPopupLogin } from "./ExtensionPopupLogin.js"
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

  const isLoading = createMemo(() => status() === extensionPopupStatus.loading)
  const isLocked = createMemo(() => status() === extensionPopupStatus.locked)
  const isLoggedOut = createMemo(() => status() === extensionPopupStatus.loggedOut)
  const isError = createMemo(() => status() === extensionPopupStatus.error)
  const isReady = createMemo(() => status() === extensionPopupStatus.ready)

  const visibleLogins = createMemo(() =>
    model().logins.filter((login) => extensionPopupLoginSearchMatch(login, searchQuerySignal.get())),
  )
  const isEmpty = createMemo(() => isReady() && visibleLogins().length === 0)
  const hasNoLogins = createMemo(() => model().logins.length === 0)

  const siteLabel = createMemo(() => hostname() ?? "No active site")

  const fieldIsCopied = (field: ExtensionPopupCopyableField) => model().copiedFieldKey === field.key
  const totpIsCopied = (login: ExtensionPopupLogin) => model().copiedFieldKey === `totp:${login.id}`

  const loginFill = (login: ExtensionPopupLogin) => commands().loginFill(login)
  const fieldCopy = (login: ExtensionPopupLogin, field: ExtensionPopupCopyableField) =>
    commands().fieldCopy(login, field)
  const totpCopy = (login: ExtensionPopupLogin) => commands().totpCopy(login)
  const loginAdd = () => commands().loginAdd()
  const vaultSync = () => commands().vaultSync()
  const vaultLock = () => commands().vaultLock()
  const vaultLogout = () => commands().vaultLogout()
  const fullVaultOpen = () => commands().fullVaultOpen()
  const accountLogin = () => commands().accountLogin()

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
    vaultUnlock,
    accountLogin,
  }
}
