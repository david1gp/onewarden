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

  const handleAuthSuccess = () => {
    navigate("/")
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
    session,
    handleAuthSuccess,
    handleLockVault,
    handleLogout,
  }
}
