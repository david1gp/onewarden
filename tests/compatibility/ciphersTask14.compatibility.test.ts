import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const expectedCipherRoutes = [
  ["GET", "/api/ciphers"],
  ["GET", "/api/ciphers/:cipher_id"],
  ["GET", "/api/ciphers/:cipher_id/admin"],
  ["GET", "/api/ciphers/:cipher_id/details"],
  ["POST", "/api/ciphers"],
  ["POST", "/api/ciphers/admin"],
  ["POST", "/api/ciphers/create"],
  ["POST", "/api/ciphers/:cipher_id"],
  ["POST", "/api/ciphers/:cipher_id/admin"],
  ["POST", "/api/ciphers/:cipher_id/delete"],
  ["POST", "/api/ciphers/:cipher_id/delete-admin"],
  ["POST", "/api/ciphers/:cipher_id/partial"],
  ["POST", "/api/ciphers/delete"],
  ["POST", "/api/ciphers/delete-admin"],
  ["POST", "/api/ciphers/move"],
  ["PUT", "/api/ciphers/:cipher_id"],
  ["PUT", "/api/ciphers/:cipher_id/admin"],
  ["PUT", "/api/ciphers/:cipher_id/archive"],
  ["PUT", "/api/ciphers/:cipher_id/delete"],
  ["PUT", "/api/ciphers/:cipher_id/delete-admin"],
  ["PUT", "/api/ciphers/:cipher_id/partial"],
  ["PUT", "/api/ciphers/:cipher_id/restore"],
  ["PUT", "/api/ciphers/:cipher_id/restore-admin"],
  ["PUT", "/api/ciphers/:cipher_id/unarchive"],
  ["PUT", "/api/ciphers/archive"],
  ["PUT", "/api/ciphers/delete"],
  ["PUT", "/api/ciphers/delete-admin"],
  ["PUT", "/api/ciphers/move"],
  ["PUT", "/api/ciphers/restore"],
  ["PUT", "/api/ciphers/restore-admin"],
  ["PUT", "/api/ciphers/unarchive"],
  ["DELETE", "/api/ciphers"],
  ["DELETE", "/api/ciphers/:cipher_id"],
  ["DELETE", "/api/ciphers/:cipher_id/admin"],
  ["DELETE", "/api/ciphers/admin"],
]

const expectedRegisteredCipherRoutes = expectedCipherRoutes.toSorted(
  ([leftMethod, leftPath], [rightMethod, rightPath]) => {
    const left = `${leftMethod} ${leftPath}`
    const right = `${rightMethod} ${rightPath}`
    return left.localeCompare(right)
  },
)

test("cipher routes and aliases match the task 14 upstream route subset", () => {
  const registrations = serverRouteRegistrationIntrospect(serverAppCreate())
    .filter((route) => route.path.startsWith("/api/ciphers"))
    .map(({ method, path }) => [method, path])
  expect(registrations).toEqual(expectedRegisteredCipherRoutes.flatMap((route) => [route, route]))

  const manifestRoutes = upstreamRouteManifest.routes
    .filter((route) => expectedCipherRoutes.some(([method, path]) => route.method === method && route.path === path))
    .map(({ method, path }) => [method, path])
  expect(
    manifestRoutes.toSorted(([leftMethod, leftPath], [rightMethod, rightPath]) => {
      const left = `${leftMethod} ${leftPath}`
      const right = `${rightMethod} ${rightPath}`
      return left.localeCompare(right)
    }),
  ).toEqual(expectedRegisteredCipherRoutes)
})

test("cipher routes retain the upstream missing-token error envelope", async () => {
  const response = await serverAppCreate().request("http://localhost/api/ciphers")
  expect(response.status).toBe(401)
  expect(await response.json()).toMatchObject({ message: "No access token provided", object: "error" })
})
