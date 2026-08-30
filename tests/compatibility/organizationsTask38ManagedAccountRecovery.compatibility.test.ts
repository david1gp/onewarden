import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const routeDefinitions = [
  {
    handler: "put_recover_account",
    id: "core.2966.put_recover_account",
    path: "/api/organizations/:org_id/users/:member_id/recover-account",
    rocketPath: "/organizations/<org_id>/users/<member_id>/recover-account",
    sourceLine: 2966,
  },
  {
    handler: "put_reset_password",
    id: "core.2984.put_reset_password",
    path: "/api/organizations/:org_id/users/:member_id/reset-password",
    rocketPath: "/organizations/<org_id>/users/<member_id>/reset-password",
    sourceLine: 2984,
  },
] as const

const resetPasswordDetailsRouteDefinition = {
  handler: "get_reset_password_details",
  id: "core.3055.get_reset_password_details",
  method: "GET",
  path: "/api/organizations/:org_id/users/:member_id/reset-password-details",
  rocketPath: "/organizations/<org_id>/users/<member_id>/reset-password-details",
  sourceLine: 3055,
} as const

const resetPasswordEnrollmentRouteDefinition = {
  handler: "put_reset_password_enrollment",
  id: "core.3128.put_reset_password_enrollment",
  method: "PUT",
  path: "/api/organizations/:org_id/users/:user_id/reset-password-enrollment",
  rocketPath: "/organizations/<org_id>/users/<user_id>/reset-password-enrollment",
  sourceLine: 3128,
} as const

test("managed-account recovery routes retain the exact upstream manifest entries", () => {
  expect(
    upstreamRouteManifest.routes.filter((route) =>
      routeDefinitions.some((definition) => definition.handler === route.handler),
    ),
  ).toEqual(
    routeDefinitions.map((definition) => ({
      condition: "always",
      handler: definition.handler,
      id: definition.id,
      method: "PUT",
      mount: "/api",
      parameters: [
        { kind: "path", name: "org_id" },
        { kind: "path", name: "member_id" },
      ],
      path: definition.path,
      query: [],
      rank: null,
      rocketPath: definition.rocketPath,
      source: { file: "src/api/core/organizations.rs", line: definition.sourceLine },
    })),
  )
})

test("managed-account recovery routes are registered and authenticated", async () => {
  const routes = serverRouteRegistrationIntrospect(serverAppCreate())
  for (const definition of routeDefinitions) {
    expect(routes.filter((route) => route.method === "PUT" && route.path === definition.path)).toHaveLength(3)
    const response = await serverAppCreate().request(
      `https://vault.example${definition.path.replaceAll(/:[^/]+/gu, "00000000-0000-4000-8000-000000000001")}`,
      {
        body: JSON.stringify({ key: "key", newMasterPasswordHash: "hash" }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    )
    expect(response.status).toBe(401)
    expect((await response.json()).message).toBe("No access token provided")
  }
})

test("managed-account reset-password details retains the exact upstream manifest entry", () => {
  expect(
    upstreamRouteManifest.routes.filter((route) => route.handler === resetPasswordDetailsRouteDefinition.handler),
  ).toEqual([
    {
      condition: "always",
      handler: resetPasswordDetailsRouteDefinition.handler,
      id: resetPasswordDetailsRouteDefinition.id,
      method: resetPasswordDetailsRouteDefinition.method,
      mount: "/api",
      parameters: [
        { kind: "path", name: "org_id" },
        { kind: "path", name: "member_id" },
      ],
      path: resetPasswordDetailsRouteDefinition.path,
      query: [],
      rank: null,
      rocketPath: resetPasswordDetailsRouteDefinition.rocketPath,
      source: { file: "src/api/core/organizations.rs", line: resetPasswordDetailsRouteDefinition.sourceLine },
    },
  ])
})

test("managed-account reset-password details is registered and authenticated", async () => {
  const routes = serverRouteRegistrationIntrospect(serverAppCreate())
  expect(
    routes.filter((route) => route.method === "GET" && route.path === resetPasswordDetailsRouteDefinition.path),
  ).toHaveLength(3)
  const response = await serverAppCreate().request(
    `https://vault.example${resetPasswordDetailsRouteDefinition.path.replaceAll(/:[^/]+/gu, "00000000-0000-4000-8000-000000000001")}`,
    { method: "GET" },
  )
  expect(response.status).toBe(401)
  expect((await response.json()).message).toBe("No access token provided")
})

test("managed-account reset-password enrollment retains the exact upstream manifest entry", () => {
  expect(
    upstreamRouteManifest.routes.filter((route) => route.handler === resetPasswordEnrollmentRouteDefinition.handler),
  ).toEqual([
    {
      condition: "always",
      handler: resetPasswordEnrollmentRouteDefinition.handler,
      id: resetPasswordEnrollmentRouteDefinition.id,
      method: resetPasswordEnrollmentRouteDefinition.method,
      mount: "/api",
      parameters: [
        { kind: "path", name: "org_id" },
        { kind: "path", name: "user_id" },
      ],
      path: resetPasswordEnrollmentRouteDefinition.path,
      query: [],
      rank: null,
      rocketPath: resetPasswordEnrollmentRouteDefinition.rocketPath,
      source: { file: "src/api/core/organizations.rs", line: resetPasswordEnrollmentRouteDefinition.sourceLine },
    },
  ])
})

test("managed-account reset-password enrollment is registered and authenticated", async () => {
  const routes = serverRouteRegistrationIntrospect(serverAppCreate())
  expect(
    routes.filter((route) => route.method === "PUT" && route.path === resetPasswordEnrollmentRouteDefinition.path),
  ).toHaveLength(3)
  const response = await serverAppCreate().request(
    `https://vault.example${resetPasswordEnrollmentRouteDefinition.path.replaceAll(/:[^/]+/gu, "00000000-0000-4000-8000-000000000001")}`,
    { body: JSON.stringify({}), headers: { "content-type": "application/json" }, method: "PUT" },
  )
  expect(response.status).toBe(401)
  expect((await response.json()).message).toBe("No access token provided")
})
