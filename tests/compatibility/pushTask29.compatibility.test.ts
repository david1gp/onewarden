import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { pushRelayAdapterCreate } from "../../src/server/contexts/push/pushRelayAdapterCreate.js"
import type { PushRelayConfiguration } from "../../src/server/contexts/push/pushRelayConfiguration.js"
import { clockTestCreate } from "../../src/shared/clock/clockTestCreate.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"

const configuration: PushRelayConfiguration = {
  enabled: true,
  relayUri: "https://push.example",
  identityUri: "https://identity.example",
  installationId: "installation-id",
  installationKey: "installation-key",
}

test("push device route aliases match the upstream method-compatible registrations", () => {
  const registrations = serverRouteRegistrationIntrospect(serverAppCreate())
    .filter((route) => route.path.includes("/devices/identifier/:device_id/"))
    .map(({ method, path }) => ({ method, path }))
  expect(registrations).toEqual([
    { method: "POST", path: "/api/devices/identifier/:device_id/clear-token" },
    { method: "POST", path: "/api/devices/identifier/:device_id/token" },
    { method: "POST", path: "/api/devices/identifier/:device_id/token" },
    { method: "PUT", path: "/api/devices/identifier/:device_id/clear-token" },
    { method: "PUT", path: "/api/devices/identifier/:device_id/token" },
    { method: "PUT", path: "/api/devices/identifier/:device_id/token" },
  ])

  const aliases = upstreamRouteManifest.aliases
  expect(aliases.find((alias) => alias.routeIds.includes("core.1510.post_device_token"))?.routeIds).toEqual([
    "core.1510.post_device_token",
    "core.1515.put_device_token",
  ])
  expect(aliases.find((alias) => alias.routeIds.includes("core.1542.put_clear_device_token"))?.routeIds).toEqual([
    "core.1542.put_clear_device_token",
    "core.1566.post_clear_device_token",
  ])
})

test("push relay registration preserves the upstream request contract", async () => {
  const calls: Array<{ body: string; url: string }> = []
  const adapter = pushRelayAdapterCreate(configuration, {
    clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
    fetch: async (input, init) => {
      calls.push({ body: typeof init?.body === "string" ? init.body : String(init?.body ?? ""), url: String(input) })
      if (String(input).includes("connect/token"))
        return new Response(JSON.stringify({ access_token: "access-token", expires_in: 60 }), { status: 200 })
      return new Response(null, { status: 200 })
    },
  })
  const result = await adapter.registerDevice({
    uuid: "device-id",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:01.000Z",
    userUuid: "user-id",
    name: "Android",
    type: 0,
    pushUuid: "push-id",
    pushToken: "push-token",
    refreshToken: "refresh-token",
    twoFactorRemember: null,
  })

  expect(result.success).toBe(true)
  expect(calls.map(({ url }) => url)).toEqual([
    "https://identity.example/connect/token",
    "https://push.example/push/register",
  ])
  expect(JSON.parse(calls[1]!.body)).toEqual({
    deviceId: "push-id",
    pushToken: "push-token",
    userId: "user-id",
    type: 0,
    identifier: "device-id",
    installationId: "installation-id",
  })
})
