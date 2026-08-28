import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"

test("admin route registrations preserve every upstream admin method and path", () => {
  const app = serverAppCreate({ admin: { config: { ADMIN_TOKEN: "compatibility-token" } } })
  const actual = serverRouteRegistrationIntrospect(app)
    .filter((route) => route.path.startsWith("/admin"))
    .map(({ method, path }) => `${method} ${path}`)
    .sort()
  const expected = manifest.routes
    .filter((route) => route.source.file === "src/api/admin.rs")
    .map((route) => `${route.method} ${route.path}`)
    .sort()
  expect([...new Set(actual)]).toEqual([...new Set(expected)])
})
