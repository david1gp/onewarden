import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const routePath = "/api/ciphers/bulk-collections"

test("bulk collection assignment route matches the upstream registration", () => {
  expect(serverRouteRegistrationIntrospect(serverAppCreate()).filter((route) => route.path === routePath)).toEqual([
    { basePath: "/", method: "POST", path: routePath },
    { basePath: "/", method: "POST", path: routePath },
  ])
  expect(upstreamRouteManifest.routes.find((route) => route.id === "core.1914.post_bulk_collections")).toEqual({
    condition: "always",
    handler: "post_bulk_collections",
    id: "core.1914.post_bulk_collections",
    method: "POST",
    mount: "/api",
    parameters: [],
    path: routePath,
    query: [],
    rank: null,
    rocketPath: "/ciphers/bulk-collections",
    source: { file: "src/api/core/organizations.rs", line: 1914 },
  })
})

test("bulk collection assignment preserves the upstream missing-token response", async () => {
  const response = await serverAppCreate().request(`http://localhost${routePath}`, { method: "POST" })
  expect(response.status).toBe(401)
  expect(await response.json()).toMatchObject({ message: "No access token provided", object: "error" })
})
