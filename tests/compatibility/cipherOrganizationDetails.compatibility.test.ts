import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const organizationDetailsRoute = "/api/ciphers/organization-details"

test("organization details route and query contract match the upstream manifest", () => {
  const currentRoutes = serverRouteRegistrationIntrospect(serverAppCreate())
    .filter((route) => route.path === organizationDetailsRoute)
    .map(({ basePath, method, path }) => ({ basePath, method, path }))
  expect(currentRoutes).toEqual([
    { basePath: "/", method: "GET", path: organizationDetailsRoute },
    { basePath: "/", method: "GET", path: organizationDetailsRoute },
    { basePath: "/", method: "GET", path: organizationDetailsRoute },
  ])

  expect(upstreamRouteManifest.routes.find((route) => route.id === "core.887.get_org_details")).toEqual({
    condition: "always",
    handler: "get_org_details",
    id: "core.887.get_org_details",
    method: "GET",
    mount: "/api",
    parameters: [],
    path: organizationDetailsRoute,
    query: [{ multiSegment: true, name: "data" }],
    rank: null,
    rocketPath: "/ciphers/organization-details?<data..>",
    source: { file: "src/api/core/organizations.rs", line: 887 },
  })
})

test("organization details is not included in the task 14 cipher route subset", () => {
  const task14Routes = serverRouteRegistrationIntrospect(serverAppCreate()).filter(
    (route) => route.path.startsWith("/api/ciphers") && route.path !== organizationDetailsRoute,
  )
  expect(task14Routes.every((route) => route.path !== organizationDetailsRoute)).toBe(true)
})
