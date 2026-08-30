import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { adminDemoStateCreate } from "./adminDemoStateCreate.js"

function demoAdminLoginPathCheck() {
  if (typeof window === "undefined") return false
  return window.location.pathname.replace(/\/+$/, "").toLowerCase() === "/demo/admin/login"
}

export function demoAdminStateCreate() {
  const adminState = adminDemoStateCreate()
  const loginVisible = createSignalObject(demoAdminLoginPathCheck())

  const routeSync = () => loginVisible.set(demoAdminLoginPathCheck())
  const loginShow = () => {
    loginVisible.set(true)
    window.history.pushState(null, "", "/demo/admin/login")
  }
  const loginComplete = () => {
    loginVisible.set(false)
    window.history.replaceState(null, "", "/demo/admin")
  }

  onMount(() => window.addEventListener("popstate", routeSync))
  onCleanup(() => window.removeEventListener("popstate", routeSync))

  return {
    adminState,
    loginVisible: loginVisible.get,
    loginShow,
    loginComplete,
  }
}
