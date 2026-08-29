import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"

const task23Handlers = new Set([
  "list_policies",
  "list_policies_token",
  "get_dummy_master_password_policy",
  "get_master_password_policy",
  "get_policy",
  "put_policy",
  "put_policy_vnext",
])

function routeKey(method: string, path: string): string {
  return `${method} ${path.replaceAll(":_org_id", ":org_id")}`
}

test("task 23 exposes the exact organization policy routes", () => {
  const upstreamRoutes = manifest.routes
    .filter((route) => task23Handlers.has(route.handler))
    .map(({ method, path }) => routeKey(method, path))
    .sort()
  const currentRoutes = [
    ...new Set(
      serverRouteRegistrationIntrospect(serverAppCreate())
        .filter((route) => route.path.startsWith("/api/organizations/") && route.path.includes("/policies"))
        .map(({ method, path }) => routeKey(method, path)),
    ),
  ].sort()

  expect(currentRoutes).toEqual(upstreamRoutes)
})

test("task 23 preserves the get and put policy method alias", () => {
  expect(manifest.aliases.find((alias) => alias.routeIds.includes("core.2034.get_policy"))).toEqual({
    kind: "method-compatibility",
    routeIds: ["core.2034.get_policy", "core.2067.put_policy"],
  })
})

test("task 23 exposes the client organization domain and SSO routes", () => {
  const currentRoutes = [
    ...new Set(
      serverRouteRegistrationIntrospect(serverAppCreate())
        .filter(
          (route) =>
            route.path.startsWith("/api/organizations/") &&
            (route.path.includes("/domain") || route.path.endsWith("/sso")),
        )
        .map(({ method, path }) => routeKey(method, path)),
    ),
  ].sort()

  expect(currentRoutes).toEqual(
    [
      "DELETE /api/organizations/:org_id/domain/:id",
      "GET /api/organizations/:org_id/domain",
      "GET /api/organizations/:org_id/domain/:id",
      "GET /api/organizations/:org_id/sso",
      "POST /api/organizations/:org_id/domain",
      "POST /api/organizations/:org_id/domain/:id/remove",
      "POST /api/organizations/:org_id/domain/:id/verify",
      "POST /api/organizations/:org_id/sso",
      "POST /api/organizations/domain/sso/verified",
    ].sort(),
  )
})
