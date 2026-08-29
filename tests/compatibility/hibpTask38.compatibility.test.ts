import { expect, test } from "bun:test"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"

test("task 38 preserves the exact upstream HIBP route metadata", () => {
  expect(manifest.routes.find((route) => route.id === "core.148.hibp_breach")).toEqual({
    condition: "always",
    handler: "hibp_breach",
    id: "core.148.hibp_breach",
    method: "GET",
    mount: "/api",
    parameters: [],
    path: "/api/hibp/breach",
    query: [{ multiSegment: false, name: "username" }],
    rank: null,
    rocketPath: "/hibp/breach?<username>",
    source: { file: "src/api/core/mod.rs", line: 148 },
  })
  expect(serverRouteRegistrationIntrospect(serverAppCreate())).toContainEqual({
    basePath: "/",
    method: "GET",
    path: "/api/hibp/breach",
  })
})
