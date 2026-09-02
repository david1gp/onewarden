import { createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"
import type { AdminDashboardTab } from "./AdminDashboardTab.js"
import type { AdminDashboardViewProps } from "./AdminDashboardViewProps.js"

const sections: readonly { id: AdminDashboardTab; label: string; icon: string }[] = [
  { id: "users", label: "Users", icon: vaultSvgIcons.users },
  { id: "organizations", label: "Organizations", icon: vaultSvgIcons.workVault },
  { id: "diagnostics", label: "Diagnostics", icon: vaultSvgIcons.shieldCheck },
  { id: "config", label: "Configuration", icon: vaultSvgIcons.cog },
  { id: "tools", label: "Mail & Backup", icon: vaultSvgIcons.server },
]

function adminDashboardTabResolve(pathname: string, search: string): AdminDashboardTab {
  const tab = new URLSearchParams(search).get("tab")
  if (tab === "users" || tab === "organizations" || tab === "diagnostics" || tab === "config" || tab === "tools") {
    return tab
  }

  const path = pathname.replace(/\/+$/, "").toLowerCase()
  if (path === "/admin-ui/organizations") return "organizations"
  if (path === "/admin-ui/diagnostics") return "diagnostics"
  if (path === "/admin-ui/config") return "config"
  if (path === "/admin-ui/tools") return "tools"
  return "users"
}

export function adminDashboardViewStateCreate(props: AdminDashboardViewProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const pathname = props.pathname ?? (() => (typeof window === "undefined" ? "/admin-ui" : window.location.pathname))
  const search = props.search ?? (() => (typeof window === "undefined" ? "" : window.location.search))
  const hash = props.hash ?? (() => (typeof window === "undefined" ? "" : window.location.hash))
  const currentTab = createSignalObject<AdminDashboardTab>(adminDashboardTabResolve(pathname(), search()))
  const successMessage = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)
  const isLoggingOut = createSignalObject(false)

  createEffect(() => currentTab.set(adminDashboardTabResolve(pathname(), search())))

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
    const url = new URL(
      `${pathname()}${search()}${hash()}`,
      typeof window === "undefined" ? "http://localhost" : window.location.origin,
    )
    url.searchParams.set("tab", tab)
    props.navigateReplace?.(`${url.pathname}${url.search}${url.hash}`)
  }

  return {
    sections,
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
