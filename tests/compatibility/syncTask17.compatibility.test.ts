import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const expectedRoutes = [
  ["GET", "/api/sync"],
  ["GET", "/api/settings/domains"],
  ["POST", "/api/settings/domains"],
  ["PUT", "/api/settings/domains"],
]

test("task 17 route paths, methods, and settings aliases preserve upstream compatibility", () => {
  const manifestRoutes = upstreamRouteManifest.routes
    .filter((route) => expectedRoutes.some(([method, path]) => route.method === method && route.path === path))
    .map((route) => [route.method, route.path])
  expect(manifestRoutes).toEqual(expectedRoutes)

  const localRoutes = new Set(
    serverRouteRegistrationIntrospect(serverAppCreate()).map((route) => `${route.method} ${route.path}`),
  )
  expect(expectedRoutes.every(([method, path]) => localRoutes.has(`${method} ${path}`))).toBe(true)
})

test("task 17 settings methods remain an explicit upstream alias", () => {
  expect(
    upstreamRouteManifest.aliases.find((alias) => alias.routeIds.includes("core.75.get_settings_domains"))?.routeIds,
  ).toEqual(["core.75.get_settings_domains", "core.112.post_settings_domains", "core.138.put_settings_domains"])
})

test("task 17 protected routes preserve the exact missing-token authentication envelope", async () => {
  for (const [method, path] of expectedRoutes) {
    const response = await serverAppCreate().request(`http://localhost${path}`, { method })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      message: "No access token provided",
      validationErrors: { "": ["No access token provided"] },
      errorModel: { message: "No access token provided", object: "error" },
      error: "",
      error_description: "",
      exceptionMessage: null,
      exceptionStackTrace: null,
      innerExceptionMessage: null,
      object: "error",
    })
  }
})
