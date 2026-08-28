import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webAppRouteResolve } from "./webAppRouteResolve.js"

export function webAppStateCreate() {
  const pathname = createSignalObject(typeof window !== "undefined" ? window.location.pathname : "/demo")

  const handlePopState = () => {
    pathname.set(window.location.pathname)
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
      window.history.pushState(null, "", href)
      pathname.set(href)
    }
  }

  onMount(() => {
    window.addEventListener("popstate", handlePopState)
    document.addEventListener("click", handleLinkClick)
  })

  onCleanup(() => {
    window.removeEventListener("popstate", handlePopState)
    document.removeEventListener("click", handleLinkClick)
  })

  const currentRoute = () => webAppRouteResolve(pathname.get())

  return {
    pathname: pathname.get,
    currentRoute,
  }
}
