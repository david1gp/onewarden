import { useLocation, useNavigate } from "@solidjs/router"
import { createEffect, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { sessionHandoffFragmentParse } from "../../shared/sessionHandoff/sessionHandoffFragmentParse.js"
import { webAdminApiClientCreate } from "../admin/model/webAdminApiClientCreate.js"
import { webAuthSessionDefault } from "../auth/model/webAuthSessionDefault.js"
import { webAuthStorageCreate } from "../auth/model/webAuthStorageCreate.js"
import { webSendAccessIdResolve } from "../sends/model/webSendAccessIdResolve.js"
import { webSessionHandoffApiClientCreate } from "../sessionHandoffs/model/webSessionHandoffApiClientCreate.js"
import { webSessionHandoffConsume } from "../sessionHandoffs/model/webSessionHandoffConsume.js"
import { webAppRouteMatch } from "../web_url/webAppRouteMatch.js"

export function webAppStateCreate() {
  const routerLocation = useLocation()
  const routerNavigate = useNavigate()
  const routeRevision = createSignalObject(0)
  const session = webAuthSessionDefault()
  const isAuthReady = createSignalObject(typeof window === "undefined" || session.session() === null)
  const isAdminLoggedIn = createSignalObject(false)
  const isAdminSessionChecking = createSignalObject(routerLocation.pathname.toLowerCase().startsWith("/admin-ui"))

  const navigationPathResolve = (path: string): string => {
    const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    return `${url.pathname}${url.search}${url.hash}`
  }

  const navigate = (path: string) => {
    routerNavigate(navigationPathResolve(path), { resolve: false })
  }

  const navigateReplace = (path: string) => {
    routerNavigate(navigationPathResolve(path), { resolve: false, replace: true })
  }

  onMount(() => {
    if (typeof window !== "undefined") {
      const fragmentResult = sessionHandoffFragmentParse(routerLocation.hash)
      const restorePromise = session.restore()
      void restorePromise.then(() => {
        if (
          !(fragmentResult.success && fragmentResult.data !== null) &&
          session.isUnauthenticated() &&
          currentRoute() === "auth-unlock"
        ) {
          navigateReplace("/login")
          return
        }
        if (new URLSearchParams(routerLocation.hash.replace(/^#/u, "")).has("onewarden-handoff")) {
          navigateReplace(`${routerLocation.pathname}${routerLocation.search}`)
        }
        if (fragmentResult.success && fragmentResult.data !== null) {
          void webSessionHandoffConsume({
            apiClient: webSessionHandoffApiClientCreate(),
            deviceIdentifier: webAuthStorageCreate().deviceIdentifierGet(),
            fragment: fragmentResult.data,
            session,
          }).then((result) => {
            if (!result.success) return
            if (routerLocation.pathname !== result.data) return navigateReplace(result.data)
            routeRevision.set(routeRevision.get() + 1)
          })
        }
      })
      void restorePromise.then(
        () => isAuthReady.set(true),
        () => isAuthReady.set(true),
      )
    }
  })

  const currentRouteMatch = () => {
    routeRevision.get()
    return webAppRouteMatch(routerLocation.pathname)
  }

  const currentRoute = () => currentRouteMatch().pageName

  const isAuthProtectedRoute = () => {
    const route = currentRoute()
    return (
      route === "root" ||
      route === "auth-unlock" ||
      route === "auth-two-factor-setup" ||
      route === "cipher-create" ||
      route === "cipher-edit" ||
      route === "cipher-view" ||
      route === "settings" ||
      route === "sends" ||
      route === "emergency-access" ||
      route === "organizations"
    )
  }

  const routeCipherId = () => {
    const id = currentRouteMatch().params.cipherId
    if (id === undefined) return null
    if (id === "new" || id === "create") return null
    return id
  }
  const currentSendAccessId = () =>
    currentRouteMatch().params.sendAccessId ?? webSendAccessIdResolve(routerLocation.pathname + routerLocation.search)
  const currentCipherCreateUri = () => {
    const rawUri = new URL(routerLocation.pathname + routerLocation.search, "http://localhost").searchParams.get("uri")
    if (rawUri === null) return null
    try {
      const uri = new URL(rawUri)
      if (uri.protocol !== "http:" && uri.protocol !== "https:") return null
      return rawUri
    } catch {
      return null
    }
  }

  createEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.lang = "en"
    document.title = currentRoute() === "admin" || currentRoute() === "admin-login" ? "OneWarden Admin" : "OneWarden"
  })

  createEffect(() => {
    const isAdminRoute = routerLocation.pathname.toLowerCase().startsWith("/admin-ui")
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
    if (currentRoute() === "auth-unlock") {
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
    pathname: () => routerLocation.pathname,
    search: () => routerLocation.search,
    hash: () => routerLocation.hash,
    navigate,
    navigateReplace,
    currentRoute,
    routeCipherId,
    currentSendAccessId,
    currentCipherCreateUri,
    isAuthProtectedRoute,
    isAuthReady: isAuthReady.get,
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
