import { expect, test } from "bun:test"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { notificationPingFrameCreate } from "../../src/server/contexts/notifications/notificationPingFrameCreate.js"

test("notification hub routes preserve upstream paths and websocket aliases", () => {
  const routes = serverRouteRegistrationIntrospect(serverAppCreate()).filter((route) =>
    route.path.startsWith("/notifications"),
  )
  expect(routes).toEqual([
    { basePath: "/", method: "GET", path: "/notifications/anonymous-hub" },
    { basePath: "/", method: "GET", path: "/notifications/hub" },
  ])
  expect(upstreamRouteManifest.routes.filter((route) => route.id.startsWith("notifications."))).toEqual([
    expect.objectContaining({ id: "notifications.122.websockets_hub", path: "/notifications/hub" }),
    expect.objectContaining({ id: "notifications.206.anonymous_websockets_hub", path: "/notifications/anonymous-hub" }),
  ])
})

test("the SignalR ping frame remains the upstream MessagePack payload", () => {
  expect([...notificationPingFrameCreate()]).toEqual([0x02, 0x91, 0x06])
})
