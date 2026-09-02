import { createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { SettingsTabName } from "./settingsNavStateCreate.js"

export interface SettingsViewProps {
  session: ReturnType<typeof webAuthSessionCreate>
  onNavigateToVault?: () => void
  onNavigateToTwoFactor?: () => void
  onLoggedOut?: () => void
  pathname?: () => string
  search?: () => string
  hash?: () => string
  navigateReplace?: (path: string) => void
}

function resolveInitialTab(pathname: string, search: string): SettingsTabName {
  const params = new URLSearchParams(search)
  const tab = params.get("tab")
  if (
    tab === "security" ||
    tab === "email" ||
    tab === "devices" ||
    tab === "emergency" ||
    tab === "tools" ||
    tab === "danger" ||
    tab === "profile"
  ) {
    return tab
  }

  const path = pathname.replace(/\/+$/, "").toLowerCase()
  if (path === "/settings/security") return "security"
  if (path === "/settings/email") return "email"
  if (path === "/settings/devices" || path === "/settings/sessions") return "devices"
  if (path === "/settings/tools" || path === "/settings/import" || path === "/settings/export") return "tools"
  if (path === "/settings/danger" || path === "/settings/delete-account") return "danger"
  if (path === "/settings/profile" || path === "/settings/account") return "profile"
  return "profile"
}

export function settingsViewStateCreate(props: SettingsViewProps) {
  const pathname = props.pathname ?? (() => (typeof window === "undefined" ? "/settings" : window.location.pathname))
  const search = props.search ?? (() => (typeof window === "undefined" ? "" : window.location.search))
  const hash = props.hash ?? (() => (typeof window === "undefined" ? "" : window.location.hash))
  const currentTab = createSignalObject<SettingsTabName>(resolveInitialTab(pathname(), search()))
  const successMessage = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)

  createEffect(() => currentTab.set(resolveInitialTab(pathname(), search())))

  const setTab = (tab: SettingsTabName) => {
    currentTab.set(tab)
    const url = new URL(
      `${pathname()}${search()}${hash()}`,
      typeof window === "undefined" ? "http://localhost" : window.location.origin,
    )
    url.searchParams.set("tab", tab)
    props.navigateReplace?.(`${url.pathname}${url.search}${url.hash}`)
  }

  const notifySuccess = (message: string) => {
    errorMessage.set(null)
    successMessage.set(message)
    setTimeout(() => {
      if (successMessage.get() === message) {
        successMessage.set(null)
      }
    }, 6000)
  }

  const notifyError = (message: string) => {
    successMessage.set(null)
    errorMessage.set(message)
  }

  const clearMessages = () => {
    successMessage.set(null)
    errorMessage.set(null)
  }

  return {
    currentTab: currentTab.get,
    setTab,
    successMessage: successMessage.get,
    errorMessage: errorMessage.get,
    notifySuccess,
    notifyError,
    clearMessages,
    handleBackToVault: () => props.onNavigateToVault?.(),
    handleNavigateToTwoFactor: () => props.onNavigateToTwoFactor?.(),
    handleAccountDeleted: () => props.onLoggedOut?.(),
  }
}
