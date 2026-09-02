import { demoRouteMatch } from "../demo/demo_url/demoRouteMatch.js"
import { pageNameDemo } from "../demo/demo_url/pageNameDemo.js"
import { getRoutesWebApp } from "../web_url/getRoutesWebApp.jsx"
import { pageNameWebApp } from "../web_url/pageNameWebApp.js"
import { urlWebApp } from "../web_url/urlWebApp.js"
import type { WebAppRouteName } from "../web_url/webAppRouteResolve.js"
import type { webAppStateCreate } from "./webAppStateCreate.js"

type WebAppState = ReturnType<typeof webAppStateCreate>
type WebAppRoute = ReturnType<typeof getRoutesWebApp>[number]

export function webAppRouteHostStateCreate(props: Readonly<{ readonly state: WebAppState }>) {
  const routes = getRoutesWebApp({ state: props.state })
  const fallbackRoute: WebAppRoute = {
    pageName: pageNameWebApp.root,
    path: "/",
    component: () => null,
    gate: "auth-unlocked",
    shell: "none",
  }

  const isDemoPath = () => {
    return demoRouteMatch(props.state.pathname()) !== null
  }
  const isDemoRoute = (route: WebAppRoute) => demoRouteMatch(route.path) !== null
  const routeResolve = (pageName: WebAppRouteName): WebAppRoute => {
    const matchingRoutes = routes.filter((route) => route.pageName === pageName)
    if (matchingRoutes.length === 0) return fallbackRoute
    return matchingRoutes.find((route) => isDemoRoute(route) === isDemoPath()) ?? matchingRoutes[0] ?? fallbackRoute
  }
  const loginRoute = routeResolve(pageNameWebApp.authLogin)
  const unlockRoute = routeResolve(pageNameWebApp.authUnlock)
  const adminLoginRoute = routeResolve(pageNameWebApp.adminLogin)
  const currentRoute = () => routeResolve(props.state.currentRoute())
  const isDemoAdminRoute = () => currentRoute().pageName === pageNameDemo.admin && isDemoPath()

  const activeRouteResolve = (): Readonly<{
    readonly route: WebAppRoute
    readonly component: WebAppRoute["component"]
  }> => {
    const route = currentRoute()
    if (isDemoAdminRoute()) return { route, component: route.component }

    if (route.gate === "auth-unlock") {
      if (props.state.session.isUnauthenticated()) return { route: loginRoute, component: loginRoute.component }
      return { route: unlockRoute, component: unlockRoute.component }
    }

    if (route.gate === "auth-unlocked") {
      if (props.state.session.isUnauthenticated()) return { route: loginRoute, component: loginRoute.component }
      if (props.state.session.isLocked()) return { route: unlockRoute, component: unlockRoute.component }
    }

    if (route.gate === "admin" && !props.state.isAdminLoggedIn()) {
      return { route: adminLoginRoute, component: adminLoginRoute.component }
    }

    return { route, component: route.component }
  }

  const activeRoute = () => activeRouteResolve().route
  const routeComponent = () => activeRouteResolve().component
  const isSessionLoading = () => !props.state.isAuthReady() && props.state.isAuthProtectedRoute()
  const isAdminSessionChecking = () =>
    currentRoute().pageName === pageNameWebApp.admin &&
    props.state.pathname().toLowerCase().startsWith("/admin-ui") &&
    props.state.isAdminSessionChecking()
  const isShellRoute = () => activeRoute().shell === "web"
  const isNavigationHeaderActionsVisible = () => {
    const pageName = activeRoute().pageName
    return (
      props.state.session.isUnlocked() &&
      (pageName === pageNameWebApp.sends ||
        pageName === pageNameWebApp.emergencyAccess ||
        pageName === pageNameWebApp.settings)
    )
  }

  return {
    routeComponent,
    isSessionLoading,
    isAdminSessionChecking,
    isShellRoute,
    isNavigationHeaderActionsVisible,
    email: () => props.state.session.session()?.email,
    navigateToVault: () => props.state.navigate(urlWebApp(pageNameWebApp.root)),
    navigateToSends: () => props.state.navigate(urlWebApp(pageNameWebApp.sends)),
    navigateToEmergencyAccess: () => props.state.navigate(urlWebApp(pageNameWebApp.emergencyAccess)),
    navigateToSettings: () => props.state.navigate(urlWebApp(pageNameWebApp.settings)),
    navigateToTwoFactor: () => props.state.navigate(urlWebApp(pageNameWebApp.authTwoFactorSetup)),
    lockVault: props.state.handleLockVault,
    logout: props.state.handleLogout,
  }
}
