import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"

const collectionRoutes = new Set([
  "GET /api/collections",
  "GET /api/organizations/:org_id/collections",
  "GET /api/organizations/:org_id/collections/details",
  "POST /api/organizations/:org_id/collections",
  "POST /api/organizations/:org_id/collections/bulk-access",
  "PUT /api/organizations/:org_id/collections/:col_id",
  "POST /api/organizations/:org_id/collections/:col_id",
  "DELETE /api/organizations/:org_id/collections/:col_id",
  "POST /api/organizations/:org_id/collections/:col_id/delete",
  "DELETE /api/organizations/:org_id/collections",
  "GET /api/organizations/:org_id/collections/:col_id/details",
  "GET /api/organizations/:org_id/collections/:col_id/users",
])

function routeKey(method: string, path: string): string {
  return `${method} ${path}`
}

test("task 21 exposes the upstream collection routes and aliases", () => {
  const upstreamRoutes = manifest.routes
    .map(({ method, path }) => routeKey(method, path))
    .filter((route) => collectionRoutes.has(route))
    .sort()
  const currentRoutes = [
    ...new Set(
      serverRouteRegistrationIntrospect(serverAppCreate())
        .map(({ method, path }) => routeKey(method, path))
        .filter((route) => collectionRoutes.has(route)),
    ),
  ].sort()

  expect(currentRoutes).toEqual(upstreamRoutes)
  expect(upstreamRoutes).toContain("POST /api/organizations/:org_id/collections/bulk-access")
  expect(upstreamRoutes).toContain("DELETE /api/organizations/:org_id/collections")
})

test("task 21 preserves collection update and delete method compatibility aliases", () => {
  expect(manifest.aliases).toContainEqual({
    kind: "method-compatibility",
    routeIds: [
      "core.635.put_organization_collection_update",
      "core.646.post_organization_collection_update",
      "core.738.delete_organization_collection",
    ],
  })
  expect(manifest.aliases).toContainEqual({
    kind: "method-compatibility",
    routeIds: [
      "core.387.get_org_collections",
      "core.496.post_organization_collections",
      "core.764.bulk_delete_organization_collections",
    ],
  })
})
