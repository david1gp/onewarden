import { expect, test } from "bun:test"
import { notificationHubCreate } from "../../../src/server/contexts/notifications/notificationHubCreate.js"
import type { NotificationWebSocketData } from "../../../src/server/contexts/notifications/notificationWebSocketData.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { jwtSign } from "../../../src/shared/crypto/jwtSign.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data

type Upgrade = { data: NotificationWebSocketData }

function upgradeServer(upgrades: Upgrade[]): { upgrade: (request: Request, options: Upgrade) => boolean } {
  return {
    upgrade: (_request, options) => {
      upgrades.push(options)
      return true
    },
  }
}

async function accessToken(): Promise<string> {
  const result = await jwtSign(
    {
      nbf: Math.floor(clock.now().getTime() / 1_000),
      exp: Math.floor(clock.now().getTime() / 1_000) + 3_600,
      iss: "https://vault.example|login",
      sub: "user-id",
      premium: true,
      name: "User",
      email: "user@example.com",
      email_verified: true,
      sstamp: "stamp",
      device: "device-id",
      devicetype: "Browser",
      client_id: "web",
      scope: ["api", "offline_access"],
      amr: ["Application"],
    },
    keyPair.privateKey,
  )
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

test("authenticated hub accepts query and Authorization token aliases and validates upgrade requests", async () => {
  const token = await accessToken()
  const upgrades: Upgrade[] = []
  const hub = notificationHubCreate({
    clock,
    identifier: identifierTestCreate(["authenticated-connection"]),
    publicKey: keyPair.publicKey,
    publicOrigin: "https://vault.example",
  })
  const server = upgradeServer(upgrades)

  expect(
    await hub.upgrade(
      new Request(`https://vault.example/notifications/hub?access_token=${encodeURIComponent(token)}`, {
        headers: { upgrade: "websocket" },
      }),
      server,
    ),
  ).toBeUndefined()
  expect(
    await hub.upgrade(
      new Request("https://vault.example/notifications/hub", {
        headers: { authorization: `Bearer ${token}`, upgrade: "websocket" },
      }),
      server,
    ),
  ).toBeUndefined()
  expect(
    (
      await hub.upgrade(
        new Request("https://vault.example/notifications/hub", { headers: { upgrade: "websocket" } }),
        server,
      )
    )?.status,
  ).toBe(401)
  expect(upgrades.map(({ data }) => data.key)).toEqual(["user-id", "user-id"])
})

test("anonymous hub enforces per-IP limits, fans out responses, handshakes, echoes, and pongs", async () => {
  const upgrades: Upgrade[] = []
  const hub = notificationHubCreate({ identifier: identifierTestCreate(["anonymous-connection"]), proxy: true })
  const server = upgradeServer(upgrades)
  const request = () =>
    new Request("https://vault.example/notifications/anonymous-hub?token=auth-request", {
      headers: { upgrade: "websocket", "x-real-ip": "192.0.2.20" },
    })

  expect(await hub.upgrade(request(), server)).toBeUndefined()
  expect(hub.anonymous.countByIp("192.0.2.20")).toBe(1)
  const data = upgrades[0]!.data
  const binary: Uint8Array[] = []
  const text: string[] = []
  const pongs: Uint8Array[] = []
  const ws = {
    data,
    ping: () => 0,
    pong: (value: Uint8Array) => {
      pongs.push(value)
      return 0
    },
    sendBinary: (value: Uint8Array) => {
      binary.push(new Uint8Array(value))
      return value.byteLength
    },
    sendText: (value: string) => {
      text.push(value)
      return 0
    },
    close: () => undefined,
  } as unknown as Bun.ServerWebSocket<NotificationWebSocketData>
  hub.websocket.open?.(ws)
  hub.websocket.message(ws, '{"protocol":"messagepack","version":1}\u001e')
  hub.websocket.message(ws, "echo")
  hub.websocket.ping?.(ws, Uint8Array.from([1, 2]) as never)
  hub.sendAnonymousAuthResponse("user-id", "auth-request")
  expect(binary[0] ? [...binary[0]] : []).toEqual([0x7b, 0x7d, 0x1e])
  expect(text).toEqual([])
  expect(pongs).toEqual([Uint8Array.from([1, 2])])
  expect(binary.some((value) => new TextDecoder().decode(value).includes("AuthRequestResponseRecieved"))).toBe(true)
  hub.websocket.close?.(ws, 1000, "")
  expect(hub.anonymous.countByIp("192.0.2.20")).toBe(0)
  for (let index = 0; index < 25; index += 1) expect(await hub.upgrade(request(), server)).toBeUndefined()
  expect((await hub.upgrade(request(), server))?.status).toBe(429)
})

test("auth-request response notifications use the anonymous and authenticated upstream frames", () => {
  const hub = notificationHubCreate()
  const anonymousFrames: Uint8Array[] = []
  const authenticatedFrames: Uint8Array[] = []
  hub.anonymous.add("auth-request", "anonymous-connection", {
    close: () => undefined,
    send: (data) => {
      anonymousFrames.push(data)
      return true
    },
  })
  hub.authenticated.add("user-id", "authenticated-connection", {
    close: () => undefined,
    send: (data) => {
      authenticatedFrames.push(data)
      return true
    },
  })

  hub.sendAnonymousAuthResponse("user-id", "auth-request")
  hub.adapter.sendUpdate(["user-id"], {
    contextId: "response-device",
    payload: { Id: "auth-request", UserId: "user-id" },
    type: 16,
  })

  expect(anonymousFrames).toHaveLength(1)
  const anonymousFrame = anonymousFrames[0] ?? new Uint8Array()
  expect(new TextDecoder().decode(anonymousFrame)).toContain("AuthRequestResponseRecieved")
  expect(new TextDecoder().decode(anonymousFrame)).toContain("auth-request")
  expect(new TextDecoder().decode(anonymousFrame)).toContain("user-id")
  expect(authenticatedFrames).toHaveLength(1)
  const authenticatedFrame = authenticatedFrames[0] ?? new Uint8Array()
  expect(new TextDecoder().decode(authenticatedFrame)).toContain("ReceiveMessage")
  expect(new TextDecoder().decode(authenticatedFrame)).toContain("response-device")
  expect(new TextDecoder().decode(authenticatedFrame)).toContain("auth-request")
  expect(new TextDecoder().decode(authenticatedFrame)).toContain("user-id")
})

test("anonymous hub releases a reserved slot when a connection closes before open", async () => {
  const upgrades: Upgrade[] = []
  const hub = notificationHubCreate({ identifier: identifierTestCreate(["anonymous-before-open"]), proxy: true })
  const server = upgradeServer(upgrades)
  const request = new Request("https://vault.example/notifications/anonymous-hub?token=auth-request", {
    headers: { upgrade: "websocket", "x-real-ip": "192.0.2.21" },
  })

  expect(await hub.upgrade(request, server)).toBeUndefined()
  const ws = { data: upgrades[0]!.data } as unknown as Bun.ServerWebSocket<NotificationWebSocketData>
  hub.websocket.close?.(ws, 1000, "")
  expect(hub.anonymous.countByIp("192.0.2.21")).toBe(0)
})
