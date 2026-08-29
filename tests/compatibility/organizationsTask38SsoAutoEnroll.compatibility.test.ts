import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const routePath = "/api/organizations/:identifier/auto-enroll-status"

test("SSO auto-enroll status keeps the exact upstream route manifest entry", () => {
  expect(upstreamRouteManifest.routes.filter((route) => route.handler === "get_auto_enroll_status")).toEqual([
    {
      condition: "always",
      handler: "get_auto_enroll_status",
      id: "core.360.get_auto_enroll_status",
      method: "GET",
      mount: "/api",
      parameters: [{ kind: "path", name: "identifier" }],
      path: routePath,
      query: [],
      rank: null,
      rocketPath: "/organizations/<identifier>/auto-enroll-status",
      source: { file: "src/api/core/organizations.rs", line: 360 },
    },
  ])
})

test("SSO auto-enroll status registers the exact route and authentication boundary", async () => {
  const currentRoutes = [
    ...new Set(
      serverRouteRegistrationIntrospect(serverAppCreate())
        .filter((route) => route.path === routePath)
        .map(({ basePath, method, path }) => `${basePath} ${method} ${path}`),
    ),
  ]
  expect(currentRoutes).toEqual([`/ GET ${routePath}`])

  const response = await serverAppCreate().request("https://vault.example/api/organizations/unknown/auto-enroll-status")
  expect(response.status).toBe(401)
  expect(response.headers.get("content-type")).toBe("application/json; charset=UTF-8")
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
})
