import { expect, test } from "bun:test"
import { serverRouteRegistrationDrift } from "../../src/server/serverRouteRegistrationDrift.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"

const duplicatedRouteRegistrations = [
  { basePath: "/", method: "DELETE", path: "/api/ciphers" },
  { basePath: "/", method: "DELETE", path: "/api/ciphers/:cipher_id" },
  { basePath: "/", method: "DELETE", path: "/api/ciphers/:cipher_id/admin" },
  { basePath: "/", method: "DELETE", path: "/api/ciphers/admin" },
  { basePath: "/", method: "DELETE", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "GET", path: "/api/ciphers" },
  { basePath: "/", method: "GET", path: "/api/ciphers/:cipher_id" },
  { basePath: "/", method: "GET", path: "/api/ciphers/:cipher_id/admin" },
  { basePath: "/", method: "GET", path: "/api/ciphers/:cipher_id/details" },
  { basePath: "/", method: "GET", path: "/api/folders" },
  { basePath: "/", method: "GET", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "POST", path: "/api/ciphers" },
  { basePath: "/", method: "POST", path: "/api/ciphers/:cipher_id" },
  { basePath: "/", method: "POST", path: "/api/ciphers/:cipher_id/admin" },
  { basePath: "/", method: "POST", path: "/api/ciphers/:cipher_id/delete" },
  { basePath: "/", method: "POST", path: "/api/ciphers/:cipher_id/delete-admin" },
  { basePath: "/", method: "POST", path: "/api/ciphers/:cipher_id/partial" },
  { basePath: "/", method: "POST", path: "/api/ciphers/admin" },
  { basePath: "/", method: "POST", path: "/api/ciphers/create" },
  { basePath: "/", method: "POST", path: "/api/ciphers/delete" },
  { basePath: "/", method: "POST", path: "/api/ciphers/delete-admin" },
  { basePath: "/", method: "POST", path: "/api/ciphers/move" },
  { basePath: "/", method: "POST", path: "/api/folders" },
  { basePath: "/", method: "POST", path: "/api/folders/:folder_id" },
  { basePath: "/", method: "POST", path: "/api/folders/:folder_id/delete" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id/admin" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id/archive" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id/delete" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id/delete-admin" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id/partial" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id/restore" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id/restore-admin" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/:cipher_id/unarchive" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/archive" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/delete" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/delete-admin" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/move" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/restore" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/restore-admin" },
  { basePath: "/", method: "PUT", path: "/api/ciphers/unarchive" },
  { basePath: "/", method: "PUT", path: "/api/folders/:folder_id" },
].flatMap((registration) => [registration, registration])

const currentRouteRegistrations = [
  ...duplicatedRouteRegistrations,
  { basePath: "/", method: "GET", path: "/health" },
  { basePath: "/", method: "GET", path: "/identity/connect/authorize" },
  { basePath: "/", method: "GET", path: "/identity/connect/oidc-signin" },
  { basePath: "/", method: "GET", path: "/identity/sso/prevalidate" },
  { basePath: "/", method: "POST", path: "/api/accounts/prelogin" },
  { basePath: "/", method: "POST", path: "/identity/accounts/prelogin" },
  { basePath: "/", method: "POST", path: "/identity/accounts/prelogin/password" },
  { basePath: "/", method: "POST", path: "/identity/accounts/register" },
  { basePath: "/", method: "POST", path: "/identity/accounts/register/finish" },
  { basePath: "/", method: "POST", path: "/identity/accounts/register/send-verification-email" },
  { basePath: "/", method: "POST", path: "/identity/connect/token" },
].sort(serverRouteRegistrationCompare)

function serverRouteRegistrationCompare(
  left: { basePath: string; method: string; path: string },
  right: { basePath: string; method: string; path: string },
): number {
  return `${left.method} ${left.basePath}${left.path}`.localeCompare(`${right.method} ${right.basePath}${right.path}`)
}

test("serverAppCreate route registrations match the current compatibility baseline", () => {
  const registrations = serverRouteRegistrationIntrospect(serverAppCreate())

  expect([...registrations].sort(serverRouteRegistrationCompare)).toEqual(currentRouteRegistrations)
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
