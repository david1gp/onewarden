import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export type AdminDashboardTab = "users" | "organizations" | "diagnostics" | "config" | "tools"

export interface AdminDashboardViewProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onLogout: () => void
  onNavigateHome?: () => void
}

function adminDashboardTabResolve(): AdminDashboardTab {
  if (typeof window === "undefined") return "users"
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase()
  if (path === "/admin-ui/organizations") return "organizations"
  if (path === "/admin-ui/diagnostics") return "diagnostics"
  if (path === "/admin-ui/config") return "config"
  if (path === "/admin-ui/tools") return "tools"
  const tab = new URLSearchParams(window.location.search).get("tab")
  if (tab === "organizations" || tab === "diagnostics" || tab === "config" || tab === "tools") return tab
  return "users"
}

export function adminDashboardViewStateCreate(props: AdminDashboardViewProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const currentTab = createSignalObject<AdminDashboardTab>(adminDashboardTabResolve())
  const successMessage = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)
  const isLoggingOut = createSignalObject(false)

  const handlePopState = () => currentTab.set(adminDashboardTabResolve())
  onMount(() => window.addEventListener("popstate", handlePopState))
  onCleanup(() => window.removeEventListener("popstate", handlePopState))

  const notifySuccess = (msg: string) => {
    successMessage.set(msg)
    setTimeout(() => successMessage.set(null), 4000)
  }

  const notifyError = (msg: string) => {
    errorMessage.set(msg)
    setTimeout(() => errorMessage.set(null), 6000)
  }

  const handleLogout = async () => {
    isLoggingOut.set(true)
    await apiClient.logout()
    isLoggingOut.set(false)
    props.onLogout()
  }

  const handleTabChange = (tab: AdminDashboardTab) => {
    currentTab.set(tab)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tab)
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
    }
  }

  return {
    currentTab: currentTab.get,
    setCurrentTab: handleTabChange,
    successMessage: successMessage.get,
    errorMessage: errorMessage.get,
    isLoggingOut: isLoggingOut.get,
    notifySuccess,
    notifyError,
    handleLogout,
    handleNavigateHome: props.onNavigateHome,
  }
}
