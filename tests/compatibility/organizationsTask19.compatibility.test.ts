import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"

const task19Handlers = new Set([
  "get_plans",
  "get_billing_metadata",
  "get_billing_warnings",
  "get_self_host_billing_metadata",
  "create_organization",
  "get_organization",
  "delete_organization",
  "post_delete_organization",
  "put_organization",
  "post_organization",
  "post_org_keys",
  "get_organization_keys",
  "leave_organization",
  "get_org_export",
  "post_api_key",
  "rotate_api_key",
])

function routeKey(method: string, path: string): string {
  return `${method} ${path.replaceAll(":_org_id", ":org_id")}`
}

test("task 19 exposes the upstream organization core routes and method aliases", () => {
  const upstreamRoutes = manifest.routes
    .filter(
      (route) =>
        task19Handlers.has(route.handler) &&
        (route.path.startsWith("/api/organizations") || route.path === "/api/plans"),
    )
    .map(({ method, path }) => routeKey(method, path))
    .sort()
  const currentRoutes = [
    ...new Set(serverRouteRegistrationIntrospect(serverAppCreate()).map((route) => routeKey(route.method, route.path))),
  ]
    .filter((route) => route.includes("/api/organizations") || route === "GET /api/plans")
    .filter((route) => !route.includes("/collections"))
    .filter((route) => !route.includes("/groups"))
    .filter((route) => !route.includes("/policies"))
    .filter((route) => !route.includes("/domain") && !route.endsWith("/sso"))
    .filter((route) => !route.includes("/public-key") && !route.includes("/users/public-keys"))
    .filter((route) => upstreamRoutes.includes(route))
    .sort()

  expect(currentRoutes).toEqual(upstreamRoutes)
  expect(manifest.aliases.find((alias) => alias.routeIds.includes("core.297.put_organization"))).toEqual({
    kind: "method-compatibility",
    routeIds: [
      "core.228.delete_organization",
      "core.285.get_organization",
      "core.297.put_organization",
      "core.307.post_organization",
    ],
  })
})
