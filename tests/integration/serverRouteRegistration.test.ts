import { expect, test } from "bun:test"
import { serverRouteRegistrationDrift } from "../../src/server/serverRouteRegistrationDrift.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"

const currentRouteRegistrations = [
  { basePath: "/", method: "GET", path: "/alive" },
  { basePath: "/", method: "GET", path: "/api/alive" },
  { basePath: "/", method: "GET", path: "/api/config" },
  { basePath: "/", method: "HEAD", path: "/alive" },
]

test("serverAppCreate route registrations match the current compatibility baseline", () => {
  const registrations = serverRouteRegistrationIntrospect(serverAppCreate({}))

  expect(registrations).toEqual(currentRouteRegistrations)
  expect(serverRouteRegistrationDrift(registrations, currentRouteRegistrations)).toEqual({ extra: [], missing: [] })
})

test("route-registration drift rejects an unplanned route even when its path is upstream-compatible", () => {
  const app = serverAppCreate({})
  app.get("/api/ciphers", (context) => context.json({}))

  const registrations = serverRouteRegistrationIntrospect(app)
  expect(serverRouteRegistrationDrift(registrations, currentRouteRegistrations)).toEqual({
    extra: [{ basePath: "/", method: "GET", path: "/api/ciphers" }],
    missing: [],
  })
})
