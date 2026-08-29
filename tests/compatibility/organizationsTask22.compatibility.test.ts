import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"

const task22Routes = new Set([
  "GET /api/organizations/:org_id/groups",
  "GET /api/organizations/:org_id/groups/details",
  "POST /api/organizations/:org_id/groups",
  "POST /api/organizations/:org_id/groups/:group_id",
  "PUT /api/organizations/:org_id/groups/:group_id",
  "GET /api/organizations/:org_id/groups/:group_id",
  "GET /api/organizations/:org_id/groups/:group_id/details",
  "POST /api/organizations/:org_id/groups/:group_id/delete",
  "DELETE /api/organizations/:org_id/groups/:group_id",
  "DELETE /api/organizations/:org_id/groups",
  "GET /api/organizations/:org_id/groups/:group_id/users",
  "PUT /api/organizations/:org_id/groups/:group_id/users",
  "POST /api/organizations/:org_id/groups/:group_id/delete-user/:member_id",
])

function routeKey(method: string, path: string): string {
  return `${method} ${path}`
}

test("task 22 exposes the complete group route set", () => {
  const upstreamRoutes = manifest.routes
    .map(({ method, path }) => routeKey(method, path))
    .filter((route) => task22Routes.has(route))
    .sort()
  const currentRoutes = [
    ...new Set(
      serverRouteRegistrationIntrospect(serverAppCreate())
        .map(({ method, path }) => routeKey(method, path))
        .filter((route) => task22Routes.has(route)),
    ),
  ].sort()

  expect(currentRoutes).toEqual(upstreamRoutes)
})

test("task 22 preserves group method compatibility aliases", () => {
  expect(manifest.aliases).toContainEqual({
    kind: "method-compatibility",
    routeIds: ["core.2509.get_groups", "core.2588.post_groups", "core.2770.bulk_delete_groups"],
  })
  expect(manifest.aliases).toContainEqual({
    kind: "method-compatibility",
    routeIds: ["core.2577.post_group", "core.2621.put_group", "core.2734.delete_group", "core.2792.get_group"],
  })
  expect(manifest.aliases).toContainEqual({
    kind: "method-compatibility",
    routeIds: ["core.2808.get_group_members", "core.2835.put_group_members"],
  })
})
