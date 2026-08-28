import { expect, test } from "bun:test"
import { serverRouteRegistrationDrift } from "../../../src/server/serverRouteRegistrationDrift.js"
import { serverRouteRegistrationIntrospect } from "../../../src/server/serverRouteRegistrationIntrospect.js"

test("serverRouteRegistrationIntrospect excludes middleware, normalizes methods, and sorts registrations", () => {
  const registrations = serverRouteRegistrationIntrospect({
    routes: [
      { basePath: "/api", method: "post", path: "/users" },
      { basePath: "/", method: "ALL", path: "/*" },
      { basePath: "/", method: "get", path: "/health" },
    ],
  })

  expect(registrations).toEqual([
    { basePath: "/", method: "GET", path: "/health" },
    { basePath: "/api", method: "POST", path: "/users" },
  ])
})

test("serverRouteRegistrationDrift reports missing, extra, and duplicate registrations", () => {
  const expected = [
    { basePath: "/", method: "GET", path: "/health" },
    { basePath: "/api", method: "GET", path: "/users" },
  ] as const
  const actual = [
    { basePath: "/api", method: "get", path: "/users" },
    { basePath: "/", method: "GET", path: "/unexpected" },
    { basePath: "/api", method: "GET", path: "/users" },
  ] as const

  expect(serverRouteRegistrationDrift(actual, expected)).toEqual({
    extra: [
      { basePath: "/api", method: "GET", path: "/users" },
      { basePath: "/", method: "GET", path: "/unexpected" },
    ],
    missing: [{ basePath: "/", method: "GET", path: "/health" }],
  })
})

test("serverRouteRegistrationDrift compares normalized mounted paths and methods", () => {
  const actual = [
    { basePath: "/api/", method: "get", path: "ciphers" },
    { basePath: "/", method: "head", path: "" },
  ] as const
  const expected = [
    { basePath: "/api", method: "GET", path: "/ciphers" },
    { basePath: "", method: "HEAD", path: "/" },
  ] as const

  expect(serverRouteRegistrationDrift(actual, expected)).toEqual({ extra: [], missing: [] })
})
