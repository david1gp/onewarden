import { expect, test } from "bun:test"
import { pushRelayAdapterCreate } from "../../../src/server/contexts/push/pushRelayAdapterCreate.js"
import type { PushRelayConfiguration } from "../../../src/server/contexts/push/pushRelayConfiguration.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const configuration: PushRelayConfiguration = {
  enabled: true,
  relayUri: "https://relay.example/",
  identityUri: "https://identity.example/",
  installationId: "installation-id",
  installationKey: "installation-key",
}

const device = {
  uuid: "device-identifier",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:01.000Z",
  userUuid: "user-id",
  name: "Mobile",
  type: 0,
  pushUuid: "push-device-id",
  pushToken: "push-token",
  refreshToken: "refresh-token",
  twoFactorRemember: null,
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status })
}

test("push relay registration uses the OAuth token and caches it for half its lifetime", async () => {
  const requests: Array<{ body: string; headers: HeadersInit; method: string; url: string }> = []
  const adapter = pushRelayAdapterCreate(configuration, {
    clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
    fetch: async (input, init) => {
      requests.push({
        body: typeof init?.body === "string" ? init.body : String(init?.body ?? ""),
        headers: init?.headers ?? {},
        method: init?.method ?? "",
        url: String(input),
      })
      if (String(input).includes("connect/token"))
        return response({ access_token: "relay-access-token", expires_in: 60 })
      return response({})
    },
  })

  expect(await adapter.registerDevice(device)).toEqual({ success: true, data: undefined })
  await adapter.dispatch({
    userId: "user-id",
    organizationId: null,
    deviceId: "push-device-id",
    identifier: "device-identifier",
    type: 7,
    payload: { id: "folder-id" },
    clientType: null,
    installationId: null,
  })

  expect(requests).toHaveLength(3)
  expect(requests[0]).toMatchObject({
    method: "POST",
    url: "https://identity.example/connect/token",
    body: "grant_type=client_credentials&scope=api.push&client_id=installation.installation-id&client_secret=installation-key",
  })
  expect(requests[1]).toMatchObject({ method: "POST", url: "https://relay.example/push/register" })
  expect(JSON.parse(requests[1]!.body)).toEqual({
    deviceId: "push-device-id",
    pushToken: "push-token",
    userId: "user-id",
    type: 0,
    identifier: "device-identifier",
    installationId: "installation-id",
  })
  expect(requests[2]).toMatchObject({ method: "POST", url: "https://relay.example/push/send" })
  expect(requests[2]!.headers).toMatchObject({
    accept: "application/json",
    authorization: "Bearer relay-access-token",
    "content-type": "application/json",
  })
  expect(JSON.parse(requests[2]!.body)).toMatchObject({ userId: "user-id", type: 7 })
})

test("push relay disabled behavior performs no upstream requests", async () => {
  let requestCount = 0
  const adapter = pushRelayAdapterCreate(
    { ...configuration, enabled: false },
    {
      fetch: async () => {
        requestCount += 1
        return response({})
      },
    },
  )

  expect(await adapter.registerDevice(device)).toEqual({ success: true, data: undefined })
  expect(await adapter.unregisterDevice(device.pushUuid)).toEqual({ success: true, data: undefined })
  await adapter.dispatch({
    userId: "user-id",
    organizationId: null,
    deviceId: null,
    identifier: null,
    type: 1,
    payload: {},
    clientType: null,
    installationId: null,
  })
  expect(requestCount).toBe(0)
})

test("push relay registration returns upstream failures while dispatch failures are swallowed", async () => {
  let dispatch = false
  const adapter = pushRelayAdapterCreate(configuration, {
    fetch: async (input) => {
      if (String(input).includes("connect/token")) return response({ access_token: "token", expires_in: 60 })
      if (String(input).includes("push/register")) return response({}, 502)
      dispatch = true
      throw new Error("relay unavailable")
    },
  })

  const registration = await adapter.registerDevice(device)
  expect(registration.success).toBe(false)
  await adapter.dispatch({
    userId: "user-id",
    organizationId: null,
    deviceId: null,
    identifier: null,
    type: 1,
    payload: {},
    clientType: null,
    installationId: null,
  })
  expect(dispatch).toBe(true)
})
