import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webAuthSessionDefault } from "../auth/model/webAuthSessionDefault.js"
import { webAppRouteResolve } from "./webAppRouteResolve.js"

export function webAppStateCreate() {
  const pathname = createSignalObject(typeof window !== "undefined" ? window.location.pathname : "/")
  const session = webAuthSessionDefault()

  const handlePopState = () => {
    if (typeof window !== "undefined") {
      pathname.set(window.location.pathname)
    }
  }

  const navigate = (path: string) => {
    if (typeof window !== "undefined") {
      const url = new URL(path, window.location.origin)
      window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`)
      pathname.set(url.pathname)
      return
    }
    pathname.set(path.split(/[?#]/, 1)[0] ?? "/")
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

  const currentRoute = () => webAppRouteResolve(pathname.get())

  const routeCipherId = () => {
    const p = pathname.get().replace(/\/+$/, "")
    const match = p.match(/^\/(?:ciphers|vault)\/([^/]+?)(?:\/edit)?$/i)
    if (!match) return null
    const id = match[1] ? decodeURIComponent(match[1]) : null
    if (id === "new" || id === "create") return null
    return id
  }

  const handleAuthSuccess = () => {
    navigate("/")
  }

  const handleVaultUnlocked = () => {
    pathname.set(pathname.get())
  }

  const handleLockVault = () => {
    session.lock()
    navigate("/unlock")
  }

  const handleLogout = () => {
    session.logout()
    navigate("/login")
  }

  return {
    pathname: pathname.get,
    navigate,
    currentRoute,
    routeCipherId,
    session,
    handleAuthSuccess,
    handleVaultUnlocked,
    handleLockVault,
    handleLogout,
  }
}
