import { expect, test } from "bun:test"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"

const expectedResponse = { data: [], object: "list" }

test("task 38 preserves the exact upstream GET /api/tasks route contract", () => {
  expect(upstreamRouteManifest.routes.filter((route) => route.path === "/api/tasks")).toEqual([
    {
      condition: "always",
      handler: "get_tasks",
      id: "core.1571.get_tasks",
      method: "GET",
      mount: "/api",
      parameters: [],
      path: "/api/tasks",
      query: [],
      rank: null,
      rocketPath: "/tasks",
      source: { file: "src/api/core/accounts.rs", line: 1571 },
    },
  ])

  expect(serverRouteRegistrationIntrospect(serverAppCreate()).filter((route) => route.path === "/api/tasks")).toEqual([
    { basePath: "/", method: "GET", path: "/api/tasks" },
  ])
})

test("task 38 preserves the anonymous empty-list response", async () => {
  const response = await serverAppCreate().request("https://vault.example/api/tasks")

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(expectedResponse)
})
