import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { SettingsTabName } from "./settingsNavStateCreate.js"

export interface SettingsViewProps {
  session: ReturnType<typeof webAuthSessionCreate>
  onNavigateToVault?: () => void
  onNavigateToTwoFactor?: () => void
  onLoggedOut?: () => void
}

function resolveInitialTab(): SettingsTabName {
  if (typeof window === "undefined") return "profile"
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase()
  if (path === "/settings/security") return "security"
  if (path === "/settings/email") return "email"
  if (path === "/settings/devices" || path === "/settings/sessions") return "devices"
  if (path === "/settings/tools" || path === "/settings/import" || path === "/settings/export") return "tools"
  if (path === "/settings/danger" || path === "/settings/delete-account") return "danger"
  if (path === "/settings/profile" || path === "/settings/account") return "profile"
  const params = new URLSearchParams(window.location.search)
  const tab = params.get("tab")
  if (
    tab === "security" ||
    tab === "email" ||
    tab === "devices" ||
    tab === "emergency" ||
    tab === "tools" ||
    tab === "danger"
  ) {
    return tab
  }
  return "profile"
}

export function settingsViewStateCreate(props: SettingsViewProps) {
  const currentTab = createSignalObject<SettingsTabName>(resolveInitialTab())
  const successMessage = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)

  const handlePopState = () => {
    if (typeof window !== "undefined") {
      currentTab.set(resolveInitialTab())
    }
  }

  onMount(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handlePopState)
    }
  })

  onCleanup(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", handlePopState)
    }
  })

  const setTab = (tab: SettingsTabName) => {
    currentTab.set(tab)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tab)
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
    }
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
