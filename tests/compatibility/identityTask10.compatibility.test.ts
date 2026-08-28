import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const task10Handlers = [
  "post_set_password",
  "profile",
  "put_profile",
  "post_profile",
  "put_avatar",
  "get_public_keys",
  "post_keys",
  "post_password",
  "post_kdf",
  "post_rotatekey",
  "post_sstamp",
  "post_delete_account",
  "delete_account",
  "revision_date",
  "verify_password",
  "post_api_key",
  "rotate_api_key",
  "get_known_device",
  "get_all_devices",
  "get_device",
  "post_device_token",
  "put_device_token",
  "put_clear_device_token",
  "post_clear_device_token",
]

function task10RouteIsAccountOrDevice(route: (typeof upstreamRouteManifest.routes)[number]): boolean {
  return (
    task10Handlers.includes(route.handler) &&
    (route.path.startsWith("/api/accounts") ||
      route.path.startsWith("/api/devices") ||
      route.path.startsWith("/api/users/"))
  )
}

const expectedTask10Routes = [
  ["POST", "/api/accounts/set-password"],
  ["GET", "/api/accounts/profile"],
  ["PUT", "/api/accounts/profile"],
  ["POST", "/api/accounts/profile"],
  ["PUT", "/api/accounts/avatar"],
  ["GET", "/api/users/:user_id/public-key"],
  ["POST", "/api/accounts/keys"],
  ["POST", "/api/accounts/password"],
  ["POST", "/api/accounts/kdf"],
  ["POST", "/api/accounts/key-management/rotate-user-account-keys"],
  ["POST", "/api/accounts/security-stamp"],
  ["POST", "/api/accounts/delete"],
  ["DELETE", "/api/accounts"],
  ["GET", "/api/accounts/revision-date"],
  ["POST", "/api/accounts/verify-password"],
  ["POST", "/api/accounts/api-key"],
  ["POST", "/api/accounts/rotate-api-key"],
  ["GET", "/api/devices/knowndevice"],
  ["GET", "/api/devices"],
  ["GET", "/api/devices/identifier/:device_id"],
  ["POST", "/api/devices/identifier/:device_id/token"],
  ["PUT", "/api/devices/identifier/:device_id/token"],
  ["PUT", "/api/devices/identifier/:device_id/clear-token"],
  ["POST", "/api/devices/identifier/:device_id/clear-token"],
]

test("task 10 route paths, casing, methods, and manifest handlers preserve upstream compatibility", () => {
  const manifestRoutes = upstreamRouteManifest.routes
    .filter(task10RouteIsAccountOrDevice)
    .map((route) => [route.method, route.path])
  expect(manifestRoutes).toEqual(expectedTask10Routes)

  const localRoutes = new Set(
    serverRouteRegistrationIntrospect(serverAppCreate()).map((route) => `${route.method} ${route.path}`),
  )
  expect([...expectedTask10Routes].every(([method, path]) => localRoutes.has(`${method} ${path}`))).toBe(true)
  expect(upstreamRouteManifest.routes.filter(task10RouteIsAccountOrDevice)).toHaveLength(expectedTask10Routes.length)
})

test("task 10 method aliases remain explicit in the upstream manifest", () => {
  expect(upstreamRouteManifest.aliases.find((alias) => alias.routeIds.includes("core.501.profile"))?.routeIds).toEqual([
    "core.501.profile",
    "core.513.put_profile",
    "core.518.post_profile",
  ])
  expect(
    upstreamRouteManifest.aliases.find((alias) => alias.routeIds.includes("core.1510.post_device_token"))?.routeIds,
  ).toEqual(["core.1510.post_device_token", "core.1515.put_device_token"])
  expect(
    upstreamRouteManifest.aliases.find((alias) => alias.routeIds.includes("core.1542.put_clear_device_token"))
      ?.routeIds,
  ).toEqual(["core.1542.put_clear_device_token", "core.1566.post_clear_device_token"])
})

test("protected task 10 routes preserve the exact missing-token authentication envelope", async () => {
  for (const [method, path] of [
    ["GET", "/api/accounts/profile"],
    ["POST", "/api/accounts/keys"],
    ["POST", "/api/accounts/delete"],
    ["GET", "/api/devices"],
    ["GET", "/api/devices/identifier/device"],
  ]) {
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
