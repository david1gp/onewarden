import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

test("anonymous auth-request creation retains the exact upstream route manifest entry", () => {
  expect(upstreamRouteManifest.routes.filter((route) => route.handler === "post_auth_request")).toEqual([
    {
      condition: "always",
      handler: "post_auth_request",
      id: "core.1591.post_auth_request",
      method: "POST",
      mount: "/api",
      parameters: [],
      path: "/api/auth-requests",
      query: [],
      rank: null,
      rocketPath: "/auth-requests",
      source: { file: "src/api/core/accounts.rs", line: 1591 },
    },
  ])
})

test("anonymous auth-request creation is registered without an authentication middleware", () => {
  expect(
    serverRouteRegistrationIntrospect(serverAppCreate()).filter(
      (route) => route.method === "POST" && route.path === "/api/auth-requests",
    ),
  ).toEqual([{ basePath: "/", method: "POST", path: "/api/auth-requests" }])
})

test("authenticated auth-request inspection and list routes retain the exact upstream manifest entries", () => {
  expect(
    upstreamRouteManifest.routes.filter((route) =>
      ["get_auth_request", "get_auth_requests", "get_auth_requests_pending"].includes(route.handler),
    ),
  ).toEqual([
    {
      condition: "always",
      handler: "get_auth_request",
      id: "core.1646.get_auth_request",
      method: "GET",
      mount: "/api",
      parameters: [{ kind: "path", name: "auth_request_id" }],
      path: "/api/auth-requests/:auth_request_id",
      query: [],
      rank: null,
      rocketPath: "/auth-requests/<auth_request_id>",
      source: { file: "src/api/core/accounts.rs", line: 1646 },
    },
    {
      condition: "always",
      handler: "get_auth_requests",
      id: "core.1789.get_auth_requests",
      method: "GET",
      mount: "/api",
      parameters: [],
      path: "/api/auth-requests",
      query: [],
      rank: null,
      rocketPath: "/auth-requests",
      source: { file: "src/api/core/accounts.rs", line: 1789 },
    },
    {
      condition: "always",
      handler: "get_auth_requests_pending",
      id: "core.1794.get_auth_requests_pending",
      method: "GET",
      mount: "/api",
      parameters: [],
      path: "/api/auth-requests/pending",
      query: [],
      rank: null,
      rocketPath: "/auth-requests/pending",
      source: { file: "src/api/core/accounts.rs", line: 1794 },
    },
  ])
})

test("authenticated auth-request response retains the exact upstream manifest entry", () => {
  expect(upstreamRouteManifest.routes.filter((route) => route.handler === "put_auth_request")).toEqual([
    {
      condition: "always",
      handler: "put_auth_request",
      id: "core.1679.put_auth_request",
      method: "PUT",
      mount: "/api",
      parameters: [{ kind: "path", name: "auth_request_id" }],
      path: "/api/auth-requests/:auth_request_id",
      query: [],
      rank: null,
      rocketPath: "/auth-requests/<auth_request_id>",
      source: { file: "src/api/core/accounts.rs", line: 1679 },
    },
  ])
})

test("anonymous auth-request response polling retains the exact upstream manifest entry", () => {
  expect(upstreamRouteManifest.routes.filter((route) => route.handler === "get_auth_request_response")).toEqual([
    {
      condition: "always",
      handler: "get_auth_request_response",
      id: "core.1752.get_auth_request_response",
      method: "GET",
      mount: "/api",
      parameters: [{ kind: "path", name: "auth_request_id" }],
      path: "/api/auth-requests/:auth_request_id/response",
      query: [{ multiSegment: false, name: "code" }],
      rank: null,
      rocketPath: "/auth-requests/<auth_request_id>/response?<code>",
      source: { file: "src/api/core/accounts.rs", line: 1752 },
    },
  ])
})

test("auth-request inspection, response, and list routes are registered with exact paths", () => {
  expect(
    serverRouteRegistrationIntrospect(serverAppCreate()).filter(
      (route) => route.method === "GET" && route.path.startsWith("/api/auth-requests"),
    ),
  ).toEqual([
    { basePath: "/", method: "GET", path: "/api/auth-requests" },
    { basePath: "/", method: "GET", path: "/api/auth-requests" },
    { basePath: "/", method: "GET", path: "/api/auth-requests/:auth_request_id" },
    { basePath: "/", method: "GET", path: "/api/auth-requests/:auth_request_id" },
    { basePath: "/", method: "GET", path: "/api/auth-requests/:auth_request_id/response" },
    { basePath: "/", method: "GET", path: "/api/auth-requests/pending" },
    { basePath: "/", method: "GET", path: "/api/auth-requests/pending" },
  ])
})

test("anonymous auth-request response polling is registered without authentication middleware", () => {
  expect(
    serverRouteRegistrationIntrospect(serverAppCreate()).filter(
      (route) => route.method === "GET" && route.path === "/api/auth-requests/:auth_request_id/response",
    ),
  ).toEqual([{ basePath: "/", method: "GET", path: "/api/auth-requests/:auth_request_id/response" }])
})

test("authenticated auth-request response is registered with the exact path", () => {
  expect(
    serverRouteRegistrationIntrospect(serverAppCreate()).filter(
      (route) => route.method === "PUT" && route.path === "/api/auth-requests/:auth_request_id",
    ),
  ).toEqual([
    { basePath: "/", method: "PUT", path: "/api/auth-requests/:auth_request_id" },
    { basePath: "/", method: "PUT", path: "/api/auth-requests/:auth_request_id" },
  ])
})

test("authenticated auth-request inspection and list routes retain the missing-token envelope", async () => {
  const app = serverAppCreate()
  for (const path of ["/api/auth-requests/auth-request-id", "/api/auth-requests", "/api/auth-requests/pending"]) {
    const response = await app.request(`http://localhost${path}`)
    expect(response.status).toBe(401)
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
  }
})

test("authenticated auth-request response retains the missing-token envelope", async () => {
  const app = serverAppCreate()
  const response = await app.request("http://localhost/api/auth-requests/auth-request-id", {
    body: JSON.stringify({
      deviceIdentifier: "device-id",
      key: "key",
      masterPasswordHash: null,
      requestApproved: true,
    }),
    headers: { "content-type": "application/json" },
    method: "PUT",
  })

  expect(response.status).toBe(401)
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
