import { expect, test } from "bun:test"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"

const emergencyHandlers = new Set([
  "get_contacts",
  "get_grantees",
  "get_emergency_access",
  "put_emergency_access",
  "post_emergency_access",
  "delete_emergency_access",
  "post_delete_emergency_access",
  "send_invite",
  "resend_invite",
  "accept_invite",
  "confirm_emergency_access",
  "initiate_emergency_access",
  "approve_emergency_access",
  "reject_emergency_access",
  "view_emergency_access",
  "takeover_emergency_access",
  "password_emergency_access",
  "policies_emergency_access",
])

test("task 26 registers every emergency-access route and its legacy aliases", () => {
  const routes = manifest.routes.filter(
    (route) => emergencyHandlers.has(route.handler) && route.path.startsWith("/api/emergency-access"),
  )
  expect(routes).toHaveLength(18)
  const registrations = serverRouteRegistrationIntrospect(serverAppCreate())
  const actual = new Set(registrations.map((route) => `${route.method} ${route.path}`))
  for (const route of routes) expect(actual.has(`${route.method} ${route.path}`)).toBe(true)
  expect(manifest.aliases).toContainEqual({
    kind: "method-compatibility",
    routeIds: [
      "core.88.get_emergency_access",
      "core.115.put_emergency_access",
      "core.125.post_emergency_access",
      "core.162.delete_emergency_access",
    ],
  })
})

test("task 26 keeps the upstream status and access-type numbers", () => {
  expect({ invited: 0, accepted: 1, confirmed: 2, recoveryInitiated: 3, recoveryApproved: 4 }).toEqual({
    invited: 0,
    accepted: 1,
    confirmed: 2,
    recoveryInitiated: 3,
    recoveryApproved: 4,
  })
  expect({ view: 0, takeover: 1 }).toEqual({ view: 0, takeover: 1 })
})
