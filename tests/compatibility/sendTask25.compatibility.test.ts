import { expect, test } from "bun:test"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { notificationUpdateType } from "../../src/server/contexts/notifications/notificationUpdateType.js"

const sendHandlers = new Set([
  "get_sends",
  "get_send",
  "post_send",
  "post_send_file",
  "post_send_file_v2",
  "post_send_file_v2_data",
  "post_access",
  "post_access_legacy",
  "post_access_file",
  "post_access_file_legacy",
  "download_send",
  "put_send",
  "delete_send",
  "put_remove_password",
])

test("task 25 registers every upstream Send route and preserves its aliases", () => {
  const routes = manifest.routes.filter((route) => sendHandlers.has(route.handler))
  expect(routes).toHaveLength(14)
  const registrations = serverRouteRegistrationIntrospect(serverAppCreate())
  const actual = new Set(registrations.map((route) => `${route.method} ${route.path}`))
  for (const route of routes) expect(actual.has(`${route.method} ${route.path}`)).toBe(true)
  expect(manifest.aliases).toContainEqual({
    canonicalRouteId: "core.451.post_access",
    kind: "legacy",
    routeIds: ["core.451.post_access", "core.469.post_access_legacy"],
  })
  expect(manifest.aliases).toContainEqual({
    canonicalRouteId: "core.526.post_access_file",
    kind: "legacy",
    routeIds: ["core.526.post_access_file", "core.544.post_access_file_legacy"],
  })
})

test("task 25 uses the upstream Send notification update codes", () => {
  expect(notificationUpdateType.syncSendCreate).toBe(12)
  expect(notificationUpdateType.syncSendUpdate).toBe(13)
  expect(notificationUpdateType.syncSendDelete).toBe(14)
})
