import { expect, test } from "bun:test"
import { hibpBreachGet } from "../../src/server/contexts/hibp/hibpBreachGet.js"
import { hibpBreachSyntheticResponseCreate } from "../../src/server/contexts/hibp/hibpBreachSyntheticResponseCreate.js"
import { hibpBreachUrlCreate } from "../../src/server/contexts/hibp/hibpBreachUrlCreate.js"
import type { HibpHttpAdapter } from "../../src/server/contexts/hibp/hibpHttpAdapter.js"
import { hibpUsernameEncode } from "../../src/server/contexts/hibp/hibpUsernameEncode.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"
import hibpFixtures from "../fixtures/hibpFixtures.json"

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

test("task 38 preserves the HIBP breach protocol fixture", async () => {
  expect(hibpUsernameEncode(hibpFixtures.username.raw)).toBe(hibpFixtures.username.encoded)
  expect(hibpBreachUrlCreate(hibpFixtures.username.raw)).toBe(hibpFixtures.request.url)
  expect(hibpBreachSyntheticResponseCreate(hibpFixtures.username.raw)).toEqual([hibpFixtures.synthetic])

  const calls: Array<{ init?: RequestInit; url: string }> = []
  const http: HibpHttpAdapter = {
    fetch: async (url, init) => {
      calls.push({ init, url })
      return new Response(JSON.stringify(hibpFixtures.success), { status: 200 })
    },
  }
  const configuredResult = await hibpBreachGet(hibpFixtures.username.raw, {
    apiKey: hibpFixtures.request.init.headers["hibp-api-key"],
    http,
  })
  expect(configuredResult).toEqual({ success: true, data: hibpFixtures.success })
  expect(calls).toEqual([{ init: hibpFixtures.request.init, url: hibpFixtures.request.url }])

  const noKeyResult = await hibpBreachGet(hibpFixtures.username.raw, { apiKey: undefined, http })
  expect(noKeyResult).toEqual({ success: true, data: [hibpFixtures.synthetic] })
})
