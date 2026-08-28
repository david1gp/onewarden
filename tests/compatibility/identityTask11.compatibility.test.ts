import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { databaseClose } from "../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../src/server/database/databaseTestCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const lifecyclePaths = [
  "/api/accounts/delete-recover",
  "/api/accounts/delete-recover-token",
  "/api/accounts/email",
  "/api/accounts/email-token",
  "/api/accounts/password-hint",
  "/api/accounts/verify-email",
  "/api/accounts/verify-email-token",
]

test("account lifecycle routes and methods remain in the upstream compatibility manifest", () => {
  const routeIds = new Set(
    upstreamRouteManifest.routes
      .filter((route) => lifecyclePaths.includes(route.path))
      .map((route) => `${route.method} ${route.path}`),
  )
  expect(routeIds).toEqual(new Set(lifecyclePaths.map((path) => `POST ${path}`)))

  const registrations = new Set(
    serverRouteRegistrationIntrospect(serverAppCreate())
      .filter((route) => lifecyclePaths.includes(route.path))
      .map((route) => `${route.method} ${route.path}`),
  )
  expect(registrations).toEqual(new Set(lifecyclePaths.map((path) => `POST ${path}`)))
})

test("lifecycle endpoints preserve POST-only routing and exact camelCase validation", async () => {
  const databaseResult = databaseTestCreate()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return
  try {
    const app = serverAppCreate({ database: databaseResult.data })
    const wrongMethod = await app.request("https://vault.example/api/accounts/password-hint", { method: "GET" })
    expect(wrongMethod.status).toBe(404)

    const invalidCase = await app.request("https://vault.example/api/accounts/password-hint", {
      body: JSON.stringify({ Email: "user@example.com" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
    expect(invalidCase.status).toBe(400)
    expect(await invalidCase.json()).toMatchObject({
      message: "Invalid request.",
      validationErrors: {
        email: ['Invalid key: Expected "email" but received undefined'],
      },
    })
  } finally {
    databaseClose(databaseResult.data)
  }
})
