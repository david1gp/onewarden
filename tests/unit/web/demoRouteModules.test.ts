import { expect, test } from "bun:test"
import { getRoutesDemo } from "../../../src/web/demo/demo_url/getRoutesDemo.jsx"
import { demoRouteAliases } from "../../../src/web/demo/demo_url/demoRouteAliases.js"
import { demoRouteMatch } from "../../../src/web/demo/demo_url/demoRouteMatch.js"
import { pageNameDemo } from "../../../src/web/demo/demo_url/pageNameDemo.js"
import type { PageRouteDemo } from "../../../src/web/demo/demo_url/pageRouteDemo.js"
import { pageRouteDemo } from "../../../src/web/demo/demo_url/pageRouteDemo.js"
import { urlDemo } from "../../../src/web/demo/demo_url/urlDemo.js"
import type { webAppStateCreate } from "../../../src/web/ui/webAppStateCreate.js"

const state = {} as ReturnType<typeof webAppStateCreate>

test("demo page names, routes, and URLs share one canonical contract", () => {
  const pageKeys = Object.keys(pageNameDemo) as PageRouteDemo[]

  expect(Object.keys(pageRouteDemo)).toEqual(pageKeys)
  expect(new Set(Object.values(pageNameDemo)).size).toBe(pageKeys.length)

  for (const pageKey of pageKeys) {
    expect(urlDemo(pageNameDemo[pageKey])).toBe(pageRouteDemo[pageKey])
  }
})

test("getRoutesDemo describes every canonical demo page as an ungated lazy route", () => {
  const routes = getRoutesDemo({ state })

  expect(routes).toHaveLength(Object.keys(pageNameDemo).length)
  expect(routes.map(({ pageName, path }) => ({ pageName, path }))).toEqual(
    (Object.keys(pageRouteDemo) as PageRouteDemo[]).map((pageKey) => ({
      pageName: pageNameDemo[pageKey],
      path: pageRouteDemo[pageKey],
    })),
  )

  for (const route of routes) {
    expect(route.component).toBeInstanceOf(Function)
    expect(route.gate).toBe("none")
    expect(route.shell).toBe("none")
    expect(route.path).toBe(urlDemo(route.pageName))
  }
})

test("demoRouteMatch owns demo aliases, including admin and organization aliases", () => {
  for (const { pageName, paths } of demoRouteAliases) {
    for (const path of paths) {
      expect(demoRouteMatch(path)).toEqual({ pageName, params: {} })
      expect(demoRouteMatch(`${path}/`)).toEqual({ pageName, params: {} })
      expect(demoRouteMatch(path.toUpperCase())).toEqual({ pageName, params: {} })
    }
  }

  expect(demoRouteMatch("/organizations")).toBeNull()
  expect(demoRouteMatch("/demo/admin/login")).toEqual({ pageName: pageNameDemo.admin, params: {} })
  expect(demoRouteMatch("/demo/org")).toEqual({ pageName: "organizations", params: {} })
  expect(demoRouteMatch("/demo/unknown")).toBeNull()
})
