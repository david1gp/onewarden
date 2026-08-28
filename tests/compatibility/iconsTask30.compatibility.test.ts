import { expect, test } from "bun:test"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"

test("task 30 preserves both upstream icon route aliases", () => {
  const iconRoutes = manifest.routes.filter((route) => route.mount === "/icons")
  expect(iconRoutes.map((route) => route.handler)).toEqual(["icon_external", "icon_internal"])
  expect(manifest.aliases).toContainEqual({
    kind: "route-alternative",
    routeIds: ["icons.85.icon_external", "icons.111.icon_internal"],
  })
  expect(serverRouteRegistrationIntrospect(serverAppCreate())).toContainEqual({
    basePath: "/",
    method: "GET",
    path: "/icons/:host/icon.png",
  })
})
