import type { JSX } from "solid-js"
import { Toaster } from "#ui/interactive/toast/Toaster.jsx"
import { WebAppRouteHost } from "./WebAppRouteHost.jsx"
import { webAppStateCreate } from "./webAppStateCreate.js"

export function WebApp(): JSX.Element {
  const state = webAppStateCreate()

  return (
    <>
      <WebAppRouteHost state={state} />
      <Toaster />
    </>
  )
}
