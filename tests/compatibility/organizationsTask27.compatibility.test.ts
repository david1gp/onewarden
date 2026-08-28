import { expect, test } from "bun:test"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"

test("task 27 registers every upstream public compatibility route and preserves its aliases", () => {
  const publicRouteHandlers = new Set([
    "get_public_keys",
    "bulk_public_keys",
    "get_organization_public_key",
    "get_organization_keys",
  ])
  const upstreamPublicRoutes = manifest.routes.filter(
    (route) => publicRouteHandlers.has(route.handler) || route.source.file === "src/api/core/public.rs",
  )
  expect(upstreamPublicRoutes.map(({ method, path }) => [method, path])).toEqual([
    ["GET", "/api/users/:user_id/public-key"],
    ["POST", "/api/organizations/:org_id/users/public-keys"],
    ["GET", "/api/organizations/:org_id/public-key"],
    ["GET", "/api/organizations/:org_id/keys"],
    ["POST", "/api/public/organization/import"],
  ])
  expect(
    manifest.aliases.filter(
      (alias) =>
        alias.kind === "legacy" &&
        alias.routeIds.some((routeId) => upstreamPublicRoutes.some((route) => route.id === routeId)),
    ),
  ).toEqual([
    {
      canonicalRouteId: "core.2942.get_organization_public_key",
      kind: "legacy",
      routeIds: ["core.2942.get_organization_public_key", "core.2959.get_organization_keys"],
    },
  ])

  const currentPublicRoutes = serverRouteRegistrationIntrospect(serverAppCreate()).filter(
    (route) =>
      route.path === "/api/users/:user_id/public-key" ||
      route.path === "/api/organizations/:org_id/users/public-keys" ||
      route.path === "/api/organizations/:org_id/public-key" ||
      route.path === "/api/organizations/:org_id/keys" ||
      route.path === "/api/public/organization/import",
  )
  expect(
    [...new Map(currentPublicRoutes.map((route) => [`${route.method} ${route.path}`, route])).values()]
      .map(({ method, path }) => [method, path])
      .sort(([leftMethod, leftPath], [rightMethod, rightPath]) =>
        `${leftMethod} ${leftPath}`.localeCompare(`${rightMethod} ${rightPath}`),
      ),
  ).toEqual(
    [
      ["GET", "/api/users/:user_id/public-key"],
      ["POST", "/api/organizations/:org_id/users/public-keys"],
      ["GET", "/api/organizations/:org_id/public-key"],
      ["GET", "/api/organizations/:org_id/keys"],
      ["POST", "/api/public/organization/import"],
    ].sort(([leftMethod, leftPath], [rightMethod, rightPath]) =>
      `${leftMethod} ${leftPath}`.localeCompare(`${rightMethod} ${rightPath}`),
    ),
  )
})

test("task 27 public import retains the upstream missing-token error envelope", async () => {
  const response = await serverAppCreate().request("http://localhost/api/public/organization/import", {
    method: "POST",
  })
  expect(response.status).toBe(401)
  expect(await response.json()).toMatchObject({ message: "No access token provided", object: "error" })
})
