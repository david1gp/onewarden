import { expect, test } from "bun:test"
import { serverRouteRegistrationDrift } from "../../src/server/serverRouteRegistrationDrift.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"

const currentRouteRegistrations = [
  { basePath: "/", method: "DELETE", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "DELETE", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "GET", path: "/api/folders" },
  { basePath: "/", method: "GET", path: "/api/folders" },
  { basePath: "/", method: "GET", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "GET", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "GET", path: "/health" },
  { basePath: "/", method: "GET", path: "/icons/:host/icon.png" },
  { basePath: "/", method: "GET", path: "/identity/connect/authorize" },
  { basePath: "/", method: "GET", path: "/identity/connect/oidc-signin" },
  { basePath: "/", method: "GET", path: "/identity/sso/prevalidate" },
  { basePath: "/", method: "POST", path: "/api/accounts/prelogin" },
  { basePath: "/", method: "POST", path: "/api/folders" },
  { basePath: "/", method: "POST", path: "/api/folders" },
  { basePath: "/", method: "POST", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "POST", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "POST", path: "/api/folders/:folder_id/delete" },
  { basePath: "/", method: "POST", path: "/api/folders/:folder_id/delete" },
  { basePath: "/", method: "POST", path: "/identity/accounts/prelogin" },
  { basePath: "/", method: "POST", path: "/identity/accounts/prelogin/password" },
  { basePath: "/", method: "POST", path: "/identity/accounts/register" },
  { basePath: "/", method: "POST", path: "/identity/accounts/register/finish" },
  { basePath: "/", method: "POST", path: "/identity/accounts/register/send-verification-email" },
  { basePath: "/", method: "POST", path: "/identity/connect/token" },
  { basePath: "/", method: "PUT", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "PUT", path: "/api/folders/:folder_id" },
]

test("serverAppCreate route registrations match the current compatibility baseline", () => {
  const registrations = serverRouteRegistrationIntrospect(serverAppCreate())

  expect(registrations).toEqual(currentRouteRegistrations)
  expect(serverRouteRegistrationDrift(registrations, currentRouteRegistrations)).toEqual({ extra: [], missing: [] })
})

test("route-registration drift rejects an unplanned route even when its path is upstream-compatible", () => {
  const app = serverAppCreate()
  app.get("/api/ciphers", (context) => context.json({}))

  const registrations = serverRouteRegistrationIntrospect(app)
  expect(serverRouteRegistrationDrift(registrations, currentRouteRegistrations)).toEqual({
    extra: [{ basePath: "/", method: "GET", path: "/api/ciphers" }],
    missing: [],
  })
})
