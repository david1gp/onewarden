import { createEffect, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webAdminApiClientCreate } from "../admin/model/webAdminApiClientCreate.js"
import { webAuthSessionDefault } from "../auth/model/webAuthSessionDefault.js"
import { webSendAccessIdResolve } from "../sends/model/webSendAccessIdResolve.js"
import { webAppRouteResolve } from "./webAppRouteResolve.js"

export function webAppStateCreate() {
  const pathname = createSignalObject(typeof window !== "undefined" ? window.location.pathname : "/")
  const location = createSignalObject(
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}${window.location.hash}` : "/",
  )
  const routeRevision = createSignalObject(0)
  const session = webAuthSessionDefault()
  const isAdminLoggedIn = createSignalObject(false)
  const isAdminSessionChecking = createSignalObject(
    typeof window !== "undefined" && window.location.pathname.toLowerCase().startsWith("/admin-ui"),
  )

  const handlePopState = () => {
    if (typeof window !== "undefined") {
      pathname.set(window.location.pathname)
      location.set(`${window.location.pathname}${window.location.search}${window.location.hash}`)
    }
  }

  const navigate = (path: string) => {
    if (typeof window !== "undefined") {
      const url = new URL(path, window.location.origin)
      window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`)
      pathname.set(url.pathname)
      location.set(`${url.pathname}${url.search}${url.hash}`)
      return
    }
    const url = new URL(path, "http://localhost")
    pathname.set(url.pathname)
    location.set(`${url.pathname}${url.search}${url.hash}`)
  }

  const handleLinkClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement).closest("a")
    if (!target) return
    const href = target.getAttribute("href")
    if (!href || href.startsWith("http") || href.startsWith("#") || target.target === "_blank") {
      return
    }
    if (href.startsWith("/")) {
      event.preventDefault()
      navigate(href)
    }
  }

  onMount(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("popstate", handlePopState)
      document.addEventListener("click", handleLinkClick)
    }
  })

  onCleanup(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("popstate", handlePopState)
      document.removeEventListener("click", handleLinkClick)
    }
  })

  const currentRoute = () => {
    routeRevision.get()
    return webAppRouteResolve(pathname.get())
  }

  const routeCipherId = () => {
    const p = pathname.get().replace(/\/+$/, "")
    const match = p.match(/^\/(?:ciphers|vault)\/([^/]+?)(?:\/edit)?$/i)
    if (!match) return null
    const id = match[1] ? decodeURIComponent(match[1]) : null
    if (id === "new" || id === "create") return null
    return id
  }
  const currentSendAccessId = () => webSendAccessIdResolve(location.get())

  createEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.lang = "en"
    document.title = currentRoute() === "admin" || currentRoute() === "admin-login" ? "OneWarden Admin" : "OneWarden"
  })

  createEffect(() => {
    const isAdminRoute = pathname.get().toLowerCase().startsWith("/admin-ui")
    if (!isAdminRoute || typeof window === "undefined") {
      isAdminSessionChecking.set(false)
      return
    }
    isAdminSessionChecking.set(true)
    webAdminApiClientCreate()
      .usersList()
      .then((result) => isAdminLoggedIn.set(result.success))
      .finally(() => isAdminSessionChecking.set(false))
  })

  const handleAuthSuccess = () => {
    navigate("/")
  }

  const handleVaultUnlocked = () => {
    if (webAppRouteResolve(pathname.get()) === "auth-unlock") {
      navigate("/")
      return
    }
    routeRevision.set(routeRevision.get() + 1)
  }

  const handleLockVault = () => {
    session.lock()
    navigate("/unlock")
  }

  const handleLogout = () => {
    session.logout()
    navigate("/login")
  }

  const handleAdminLoginSuccess = () => {
    isAdminLoggedIn.set(true)
    navigate("/admin-ui")
  }

  const handleAdminLogout = () => {
    isAdminLoggedIn.set(false)
    navigate("/admin-ui/login")
  }

  return {
    pathname: pathname.get,
    navigate,
    currentRoute,
    routeCipherId,
    currentSendAccessId,
    session,
    isAdminLoggedIn: isAdminLoggedIn.get,
    isAdminSessionChecking: isAdminSessionChecking.get,
    handleAuthSuccess,
    handleVaultUnlocked,
    handleLockVault,
    handleLogout,
    handleAdminLoginSuccess,
    handleAdminLogout,
  }
}
