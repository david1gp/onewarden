import { expect, test } from "bun:test"
import { getRoutesDemo } from "../../../src/web/demo/demo_url/getRoutesDemo.jsx"
import { pageNameDemo } from "../../../src/web/demo/demo_url/pageNameDemo.js"
import type { PageRouteDemo } from "../../../src/web/demo/demo_url/pageRouteDemo.js"
import { pageRouteDemo } from "../../../src/web/demo/demo_url/pageRouteDemo.js"
import type { webAppStateCreate } from "../../../src/web/ui/webAppStateCreate.js"
import { getRoutesWebApp } from "../../../src/web/web_url/getRoutesWebApp.jsx"

const state = {} as ReturnType<typeof webAppStateCreate>

test("getRoutesWebApp composes the demo route registry after web routes", () => {
  const demoRoutes = getRoutesDemo({ state })
  const webAppRoutes = getRoutesWebApp({ state })
  const routeMetadata = (routes: readonly { pageName: string; path: string }[]) =>
    routes.map(({ pageName, path }) => ({ pageName, path }))

  expect(routeMetadata(webAppRoutes.slice(-demoRoutes.length))).toEqual(routeMetadata(demoRoutes))
  expect(routeMetadata(demoRoutes)).toEqual(
    (Object.keys(pageRouteDemo) as PageRouteDemo[]).map((pageKey) => ({
      pageName: pageNameDemo[pageKey],
      path: pageRouteDemo[pageKey],
    })),
  )
})

test("getRoutesDemo keeps the demo admin route outside authenticated web gates", () => {
  const adminRoute = getRoutesDemo({ state }).find((route) => route.pageName === pageNameDemo.admin)

  expect(adminRoute).toMatchObject({ path: pageRouteDemo.admin, gate: "none", shell: "none" })
})

test("getRoutesWebApp keeps canonical demo paths unique in the composed registry", () => {
  const routes = getRoutesWebApp({ state })
  const demoRoutes = getRoutesDemo({ state })
  const paths = routes.map(({ path }) => path)

  expect(new Set(paths).size).toBe(paths.length)
  expect(routes.slice(-demoRoutes.length).map(({ pageName, path }) => ({ pageName, path }))).toEqual(
    demoRoutes.map(({ pageName, path }) => ({ pageName, path })),
  )
  expect(demoRoutes.every((route) => typeof route.component === "function")).toBe(true)
})
