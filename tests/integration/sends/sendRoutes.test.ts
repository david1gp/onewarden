import { afterEach, expect, test } from "bun:test"
import { sendAccessIdCreate } from "../../../src/server/contexts/sends/sendAccessIdCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { sendFileStorageAdapterCreate } from "../../../src/server/contexts/sends/sendFileStorageAdapterCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const date = "2026-08-28T00:00:00.000Z"
const databases: DatabaseConnection[] = []

function userCreate(uuid = "send-user"): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: date,
    updatedAt: date,
    verifiedAt: date,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: `${uuid}@example.com`,
    emailNew: null,
    emailNewToken: null,
    name: "Send User",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: `${uuid}-stamp`,
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function deviceCreate(userUuid: string): IdentityDevice {
  return {
    uuid: "send-device",
    createdAt: date,
    updatedAt: date,
    userUuid,
    name: "Send Device",
    type: 7,
    pushUuid: "push-device",
    pushToken: "push-token",
    refreshToken: "refresh-token",
    twoFactorRemember: null,
  }
}

async function contextCreate(options?: {
  identifiers?: string[]
  quotaBytes?: number
  sendsAllowed?: boolean
}): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
  notifications: unknown[]
  pushes: unknown[]
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = userCreate()
  const device = deviceCreate(user.uuid)
  if (!identityUserSave(database, user).success) throw new Error("user save failed")
  if (!identityDeviceSave(database, device, clockTestCreate(date), false).success) throw new Error("device save failed")
  const clock = clockTestCreate(date)
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "send-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  const notifications: unknown[] = []
  const pushes: unknown[] = []
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate(),
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      identifier: identifierTestCreate(options?.identifiers ?? ["send-one", "send-file", "file-one", "send-two"]),
    },
    sends: {
      notification: {
        sendSendUpdate: (notification) => {
          notifications.push(notification)
        },
      },
      push: {
        registerDevice: async () => ({ success: true, data: undefined }),
        unregisterDevice: async () => ({ success: true, data: undefined }),
        dispatch: async (notification) => {
          pushes.push(notification)
        },
      },
      quotaBytes: options?.quotaBytes,
      sendsAllowed: options?.sendsAllowed,
      storage: sendFileStorageAdapterCreate(),
    },
  })
  return { app, database, notifications, pushes, token: tokenResult.data.accessToken }
}

function jsonHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" }
}

function sendData(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 0,
    key: "encrypted-key",
    password: null,
    maxAccessCount: null,
    expirationDate: null,
    deletionDate: "2026-09-01T00:00:00.000Z",
    disabled: false,
    hideEmail: false,
    name: "Secret Send",
    notes: "notes",
    text: { text: "secret" },
    file: null,
    ...overrides,
  }
}

async function sendAccessToken(
  app: ReturnType<typeof serverAppCreate>,
  accessId: string,
  password?: string,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: "send-client",
    grant_type: "send_access",
    send_id: accessId,
  })
  if (password !== undefined) body.set("password_hash_b64", password)
  const response = await app.request("https://vault.example/identity/connect/token", { body, method: "POST" })
  expect(response.status).toBe(200)
  return (await response.json()).access_token
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("Send text CRUD, legacy access, password removal, and notifications match the API contract", async () => {
  const context = await contextCreate()
  const createResponse = await context.app.request("https://vault.example/api/sends", {
    body: JSON.stringify(sendData({ password: "secret-password" })),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  const created = await createResponse.json()
  expect(created).toMatchObject({ authType: 1, name: "Secret Send", object: "send", type: 0 })
  expect(created.password).toBeString()

  expect(
    (
      await context.app.request("https://vault.example/api/sends", {
        headers: jsonHeaders(context.token),
        method: "GET",
      })
    ).status,
  ).toBe(200)
  const missingPassword = await context.app.request(`https://vault.example/api/sends/access/${created.accessId}`, {
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(missingPassword.status).toBe(401)
  const wrongPassword = await context.app.request(`https://vault.example/api/sends/access/${created.accessId}`, {
    body: JSON.stringify({ password: "wrong" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(wrongPassword.status).toBe(400)
  const accessResponse = await context.app.request(`https://vault.example/api/sends/access/${created.accessId}`, {
    body: JSON.stringify({ password: "secret-password" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(accessResponse.status).toBe(200)
  expect(await accessResponse.json()).toMatchObject({
    creatorIdentifier: "send-user@example.com",
    object: "send-access",
  })

  const updateResponse = await context.app.request(`https://vault.example/api/sends/${created.id}`, {
    body: JSON.stringify(sendData({ name: "Updated Send", text: { text: "updated" } })),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(updateResponse.status).toBe(200)
  expect((await updateResponse.json()).name).toBe("Updated Send")
  const removePassword = await context.app.request(`https://vault.example/api/sends/${created.id}/remove-password`, {
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(removePassword.status).toBe(200)
  expect((await removePassword.json()).password).toBeNull()
  const deleteResponse = await context.app.request(`https://vault.example/api/sends/${created.id}`, {
    headers: jsonHeaders(context.token),
    method: "DELETE",
  })
  expect(deleteResponse.status).toBe(200)
  expect(context.notifications.map((notification) => (notification as { type: number }).type)).toEqual([
    12, 13, 13, 13, 14,
  ])
  expect(context.pushes.map((notification) => (notification as { type: number }).type)).toEqual([12, 13, 13, 13, 14])
})

test("Send access tokens support authenticated access, max access, expiration, and deletion windows", async () => {
  const context = await contextCreate({ identifiers: ["limited-send", "expired-send", "deleted-send"] })
  const createResponse = await context.app.request("https://vault.example/api/sends", {
    body: JSON.stringify(sendData({ maxAccessCount: "1", name: "Limited" })),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const created = await createResponse.json()
  const accessToken = await sendAccessToken(context.app, created.accessId)
  const accessResponse = await context.app.request("https://vault.example/api/sends/access", {
    headers: { authorization: `Bearer ${accessToken}` },
    method: "POST",
  })
  expect(accessResponse.status).toBe(200)
  const secondToken = await context.app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({ client_id: "send-client", grant_type: "send_access", send_id: created.accessId }),
    method: "POST",
  })
  expect(secondToken.status).toBe(404)

  const expired = await context.app.request("https://vault.example/api/sends", {
    body: JSON.stringify(sendData({ expirationDate: date, name: "Expired" })),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const expiredData = await expired.json()
  const expiredAccess = await context.app.request(`https://vault.example/api/sends/access/${expiredData.accessId}`, {
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(expiredAccess.status).toBe(404)

  const deleted = await context.app.request("https://vault.example/api/sends", {
    body: JSON.stringify(sendData({ deletionDate: date, name: "Deleted" })),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const deletedData = await deleted.json()
  const deletedAccess = await context.app.request(`https://vault.example/api/sends/access/${deletedData.accessId}`, {
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(deletedAccess.status).toBe(404)
})

test("Send v2 files enforce quota, validate uploads, issue download tokens, and delete storage", async () => {
  const context = await contextCreate({ identifiers: ["file-send", "file-id"], quotaBytes: 5 })
  const createResponse = await context.app.request("https://vault.example/api/sends/file/v2", {
    body: JSON.stringify(
      sendData({
        file: { fileName: "secret.txt" },
        fileLength: "5",
        name: "File Send",
        text: null,
        type: 1,
      }),
    ),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  const upload = await createResponse.json()
  const fileId = upload.url.split("/").at(-1)
  const boundary = "onewarden-task25-boundary"
  const uploadBody = new TextEncoder().encode(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="data"; filename="secret.txt"`,
      "Content-Type: text/plain",
      "",
      "hello",
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  )
  const uploadResponse = await context.app.request(`https://vault.example/api${upload.url}`, {
    body: uploadBody as unknown as BodyInit,
    headers: {
      authorization: `Bearer ${context.token}`,
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    method: "POST",
  })
  if (uploadResponse.status !== 200) console.log(await uploadResponse.clone().text())
  expect(uploadResponse.status).toBe(200)

  const token = await sendAccessToken(context.app, upload.sendResponse.accessId)
  const fileAccess = await context.app.request(`https://vault.example/api/sends/access/file/${fileId}`, {
    headers: { authorization: `Bearer ${token}` },
    method: "POST",
  })
  expect(fileAccess.status).toBe(200)
  const download = await fileAccess.json()
  const downloadResponse = await context.app.request(download.url)
  expect(downloadResponse.status).toBe(200)
  expect(await downloadResponse.text()).toBe("hello")

  const tooLarge = await context.app.request("https://vault.example/api/sends/file/v2", {
    body: JSON.stringify(sendData({ file: { fileName: "too-large.txt" }, fileLength: 1, text: null, type: 1 })),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(tooLarge.status).toBe(400)
  const deleteResponse = await context.app.request(`https://vault.example/api/sends/${upload.sendResponse.id}`, {
    headers: jsonHeaders(context.token),
    method: "DELETE",
  })
  expect(deleteResponse.status).toBe(200)
  expect((await context.app.request(download.url)).status).toBe(404)
})

test("Send mutations honor the global sends policy", async () => {
  const context = await contextCreate({ sendsAllowed: false })
  const response = await context.app.request("https://vault.example/api/sends", {
    body: JSON.stringify(sendData()),
    headers: jsonHeaders(context.token),
    method: "POST",
  })

  expect(response.status).toBe(400)
})

test("Send legacy access identifiers retain UUID-compatible base64url encoding", () => {
  expect(sendAccessIdCreate("00000000-0000-0000-0000-000000000001")).toBe("AAAAAAAAAAAAAAAAAAAAAQ")
})
