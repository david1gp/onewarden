import { afterEach, expect, test } from "bun:test"
import * as v from "valibot"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityMailAdapter } from "../../../src/server/contexts/identity/identityMailAdapter.js"
import { identityPasswordTokenResponseSchema } from "../../../src/server/contexts/identity/identityPasswordTokenResponseSchema.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { PushRelayAdapter } from "../../../src/server/contexts/push/pushRelayAdapter.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []
const mail: IdentityMailAdapter = {
  sendRegisterVerifyEmail: async () => resultCreate(undefined),
  sendWelcome: async () => resultCreate(undefined),
  sendWelcomeMustVerify: async () => resultCreate(undefined),
}

type PushCalls = {
  registrations: Array<{ pushUuid: string | null; pushToken: string | null; uuid: string }>
  unregistrations: Array<string | null>
}

async function contextCreate(failRegistration = false) {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordResult = await passwordHashCreate("password", salt, 100_000)
  if (!passwordResult.success) throw new Error(passwordResult.errorMessage)
  const user: IdentityUser = {
    uuid: "push-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "push@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Push User",
    passwordHash: passwordResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "push-security-stamp",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 100_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const calls: PushCalls = { registrations: [], unregistrations: [] }
  const push: PushRelayAdapter = {
    registerDevice: async (device) => {
      calls.registrations.push({ pushUuid: device.pushUuid, pushToken: device.pushToken, uuid: device.uuid })
      return failRegistration
        ? resultErrorCreate("testPush", "relay failed", { code: "platform.unavailable", statusCode: 503 })
        : resultCreate(undefined)
    },
    unregisterDevice: async (pushUuid) => {
      calls.unregistrations.push(pushUuid)
      return resultCreate(undefined)
    },
    dispatch: async () => undefined,
  }
  const app = serverAppCreate({
    database,
    identity: {
      config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 }),
      database,
      identifier: { uuid: () => "push-record-id" },
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
    push: { adapter: push },
  })
  return { app, calls, database }
}

async function login(app: ReturnType<typeof serverAppCreate>): Promise<string> {
  const response = await app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({
      client_id: "web",
      device_identifier: "push-device",
      device_name: "Push Device",
      device_type: "0",
      grant_type: "password",
      password: "password",
      scope: "api offline_access",
      username: "push@example.com",
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
  expect(response.status).toBe(200)
  const parsed = v.safeParse(identityPasswordTokenResponseSchema, await response.json())
  if (!parsed.success) throw new Error("Push test login response was invalid")
  return parsed.output.access_token
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("push token POST and PUT aliases register the authenticated device, and clear aliases unregister it", async () => {
  const context = await contextCreate()
  const token = await login(context.app)
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" }

  const post = await context.app.request("https://vault.example/api/devices/identifier/other-device/token", {
    body: JSON.stringify({ pushToken: "mobile-push-token" }),
    headers,
    method: "POST",
  })
  expect(post.status).toBe(200)
  expect(context.calls.registrations).toEqual([
    { pushUuid: "push-record-id", pushToken: "mobile-push-token", uuid: "push-device" },
  ])
  expect(context.database.query("SELECT push_token, push_uuid FROM devices WHERE uuid = ?").get("push-device")).toEqual(
    {
      push_token: "mobile-push-token",
      push_uuid: "push-record-id",
    },
  )

  const unchanged = await context.app.request("https://vault.example/api/devices/identifier/push-device/token", {
    body: JSON.stringify({ pushToken: "mobile-push-token" }),
    headers,
    method: "PUT",
  })
  expect(unchanged.status).toBe(200)
  expect(context.calls.registrations).toHaveLength(1)

  const clear = await context.app.request("https://vault.example/api/devices/identifier/push-device/clear-token", {
    headers: { "x-real-ip": "192.0.2.10" },
    method: "POST",
  })
  expect(clear.status).toBe(200)
  expect(context.calls.unregistrations).toEqual(["push-record-id"])
  expect(context.database.query("SELECT push_token FROM devices WHERE uuid = ?").get("push-device")).toEqual({
    push_token: null,
  })
})

test("push registration failures are returned after retaining the local push token", async () => {
  const context = await contextCreate(true)
  const token = await login(context.app)
  const response = await context.app.request("https://vault.example/api/devices/identifier/push-device/token", {
    body: JSON.stringify({ pushToken: "mobile-push-token" }),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    method: "PUT",
  })

  expect(response.status).toBe(503)
  expect(context.database.query("SELECT push_token FROM devices WHERE uuid = ?").get("push-device")).toEqual({
    push_token: "mobile-push-token",
  })
})
