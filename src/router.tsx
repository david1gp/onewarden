import { createRouter } from "@tanstack/solid-router"
import { routeTree } from "./routeTree.gen.js"

export function getRouter() {
  return createRouter({
    routeTree,
    notFoundMode: "root",
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
  })
}

declare module "@tanstack/solid-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
