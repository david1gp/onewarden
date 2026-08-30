import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

test("cipher purge variants retain the upstream route and query contracts", () => {
  expect(
    upstreamRouteManifest.routes
      .filter((route) => route.path === "/api/ciphers/purge")
      .map(({ handler, method, path, query }) => ({ handler, method, path, query })),
  ).toEqual([
    {
      handler: "purge_org_vault",
      method: "POST",
      path: "/api/ciphers/purge",
      query: [{ multiSegment: true, name: "organization" }],
    },
    {
      handler: "purge_personal_vault",
      method: "POST",
      path: "/api/ciphers/purge",
      query: [],
    },
  ])

  expect(
    serverRouteRegistrationIntrospect(serverAppCreate())
      .filter((route) => route.method === "POST" && route.path === "/api/ciphers/purge")
      .map(({ method, path }) => [method, path]),
  ).toEqual([
    ["POST", "/api/ciphers/purge"],
    ["POST", "/api/ciphers/purge"],
    ["POST", "/api/ciphers/purge"],
    ["POST", "/api/ciphers/purge"],
    ["POST", "/api/ciphers/purge"],
  ])
})
