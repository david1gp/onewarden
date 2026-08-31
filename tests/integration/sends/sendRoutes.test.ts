import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { sendAccessIdCreate } from "../../../src/server/contexts/sends/sendAccessIdCreate.js"
import { sendFileStorageAdapterCreate } from "../../../src/server/contexts/sends/sendFileStorageAdapterCreate.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { identityTestDeviceCreate } from "../../helpers/identityTestDeviceCreate.js"
import { identityTestUserCreate } from "../../helpers/identityTestUserCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const date = "2026-08-28T00:00:00.000Z"
const databases: DatabaseConnection[] = []

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
  mail: ReturnType<typeof identityMailAdapterCreate>
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = identityTestUserCreate("send-user", { name: "Send User", passwordIterations: 100_000 })
  const device = identityTestDeviceCreate(user.uuid, {
    uuid: "send-device",
    name: "Send Device",
    pushUuid: "push-device",
    pushToken: "push-token",
  })
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
  const mail = identityMailAdapterCreate(clock)
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
      mail,
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
  return { app, database, mail, notifications, pushes, token: tokenResult.data.accessToken }
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

async function sendAccessTokenRequest(
  app: ReturnType<typeof serverAppCreate>,
  accessId: string,
  options?: { email?: string; otp?: string },
): Promise<Response> {
  const body = new URLSearchParams({
    client_id: "send-client",
    grant_type: "send_access",
    scope: "api.send.access",
    send_id: accessId,
  })
  if (options?.email !== undefined) body.set("email", options.email)
  if (options?.otp !== undefined) body.set("otp", options.otp)
  return app.request("https://vault.example/identity/connect/token", { body, method: "POST" })
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

test("Send recipient verification normalizes recipients, sends hashed OTPs, and consumes access atomically", async () => {
  const context = await contextCreate({ identifiers: ["email-send"] })
  const createResponse = await context.app.request("https://vault.example/api/sends", {
    body: JSON.stringify(
      sendData({
        emails: " Recipient@Example.com, recipient@example.com, second@example.com ",
        name: "Email Send",
        password: "ignored-password",
      }),
    ),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  const created = await createResponse.json()
  expect(created).toMatchObject({ authType: 0, emails: "recipient@example.com,second@example.com" })
  expect(created.password).toBeNull()
  expect(context.database.query("SELECT emails FROM sends WHERE uuid = ?").get(created.id)).toEqual({
    emails: "recipient@example.com,second@example.com",
  })

  const missingEmail = await sendAccessTokenRequest(context.app, created.accessId)
  expect(missingEmail.status).toBe(400)
  expect(await missingEmail.json()).toMatchObject({
    error: "invalid_request",
    send_access_error_type: "email_required",
  })

  const invalidEmail = await sendAccessTokenRequest(context.app, created.accessId, {
    email: "not-recipient@example.com",
  })
  expect(invalidEmail.status).toBe(404)
  const invalidEmailBody = await invalidEmail.text()
  expect(invalidEmailBody).toContain('"send_access_error_type":"email_invalid"')
  expect(invalidEmailBody).not.toContain("not-recipient@example.com")

  const issueResponse = await sendAccessTokenRequest(context.app, created.accessId, {
    email: " RECIPIENT@example.com ",
  })
  expect(issueResponse.status).toBe(400)
  expect(await issueResponse.json()).toMatchObject({
    error: "invalid_request",
    send_access_error_type: "email_and_otp_required_otp_sent",
  })
  const message = context.mail.messages.find((item) => item.kind === "sendOtp")
  expect(message).toBeDefined()
  expect(message?.recipient).toBe("recipient@example.com")
  expect(message?.targetEmail).toBeNull()
  expect(message?.token).toMatch(/^\d{6}$/)
  const verification = context.database
    .query("SELECT otp_hash, otp_salt, attempts FROM send_recipient_verifications WHERE send_uuid = ? AND email = ?")
    .get(created.id, "recipient@example.com") as { otp_hash: string; otp_salt: string; attempts: number }
  expect(verification.otp_hash).toHaveLength(64)
  expect(verification.otp_salt).not.toBe("")
  expect(verification.attempts).toBe(0)
  expect(verification.otp_hash).not.toBe(message?.token)
  expect(JSON.stringify(verification)).not.toContain(message?.token ?? "")

  const resendResponse = await sendAccessTokenRequest(context.app, created.accessId, { email: "recipient@example.com" })
  expect(resendResponse.status).toBe(429)
  expect((await resendResponse.json()).send_access_error_type).toBe("rate_limited")

  context.database.run("UPDATE send_recipient_verifications SET otp_expires_at = ? WHERE send_uuid = ? AND email = ?", [
    "2026-08-27T00:00:00.000Z",
    created.id,
    "recipient@example.com",
  ])
  const expiredOtp = await sendAccessTokenRequest(context.app, created.accessId, {
    email: "recipient@example.com",
    otp: message?.token ?? "",
  })
  expect(expiredOtp.status).toBe(404)
  expect((await expiredOtp.json()).send_access_error_type).toBe("otp_invalid")
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM send_recipient_verifications WHERE send_uuid = ?")
      .get(created.id),
  ).toEqual({ count: 0 })

  const refreshedIssue = await sendAccessTokenRequest(context.app, created.accessId, { email: "recipient@example.com" })
  expect(refreshedIssue.status).toBe(400)
  const refreshedMessage = context.mail.messages[context.mail.messages.length - 1]
  expect(refreshedMessage?.token).toMatch(/^\d{6}$/)
  context.database.run("UPDATE send_recipient_verifications SET resend_count = 5 WHERE send_uuid = ? AND email = ?", [
    created.id,
    "recipient@example.com",
  ])
  const resendLimit = await sendAccessTokenRequest(context.app, created.accessId, { email: "recipient@example.com" })
  expect(resendLimit.status).toBe(429)
  expect((await resendLimit.json()).send_access_error_type).toBe("rate_limited")

  const wrongOtp = await sendAccessTokenRequest(context.app, created.accessId, {
    email: "recipient@example.com",
    otp: "000000",
  })
  expect(wrongOtp.status).toBe(404)
  expect((await wrongOtp.json()).send_access_error_type).toBe("otp_invalid")
  expect(
    context.database
      .query<{ attempts: number }, [string, string]>(
        "SELECT attempts FROM send_recipient_verifications WHERE send_uuid = ? AND email = ?",
      )
      .get(created.id, "recipient@example.com")?.attempts,
  ).toBe(1)

  const tokenResponse = await sendAccessTokenRequest(context.app, created.accessId, {
    email: "recipient@example.com",
    otp: refreshedMessage?.token ?? "",
  })
  expect(tokenResponse.status).toBe(200)
  const accessToken = (await tokenResponse.json()).access_token as string
  const publicAccess = await context.app.request("https://vault.example/api/sends/access", {
    headers: { authorization: `Bearer ${accessToken}` },
    method: "POST",
  })
  expect(publicAccess.status).toBe(200)
  const publicBody = await publicAccess.text()
  expect(publicBody).not.toContain("recipient@example.com")
  expect(publicBody).not.toContain(message?.token ?? "")
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM send_recipient_verifications WHERE send_uuid = ?")
      .get(created.id),
  ).toEqual({ count: 0 })

  const replay = await sendAccessTokenRequest(context.app, created.accessId, {
    email: "recipient@example.com",
    otp: refreshedMessage?.token ?? "",
  })
  expect(replay.status).toBe(404)
  expect((await replay.json()).send_access_error_type).toBe("otp_invalid")

  const issueForCleanup = await sendAccessTokenRequest(context.app, created.accessId, { email: "second@example.com" })
  expect(issueForCleanup.status).toBe(400)
  const secondMessage = context.mail.messages[context.mail.messages.length - 1]
  expect(secondMessage?.recipient).toBe("second@example.com")
  const legacyAccess = await context.app.request(`https://vault.example/api/sends/access/${created.accessId}`, {
    body: JSON.stringify({ email: "second@example.com", otp: secondMessage?.token ?? "" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(legacyAccess.status).toBe(200)
  expect((await legacyAccess.json()).name).toBe("Email Send")
  const updateResponse = await context.app.request(`https://vault.example/api/sends/${created.id}`, {
    body: JSON.stringify(sendData({ emails: "updated@example.com" })),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(updateResponse.status).toBe(200)
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM send_recipient_verifications WHERE send_uuid = ?")
      .get(created.id),
  ).toEqual({ count: 0 })

  const issueForDelete = await sendAccessTokenRequest(context.app, created.accessId, { email: "updated@example.com" })
  expect(issueForDelete.status).toBe(400)
  const deleteResponse = await context.app.request(`https://vault.example/api/sends/${created.id}`, {
    headers: jsonHeaders(context.token),
    method: "DELETE",
  })
  expect(deleteResponse.status).toBe(200)
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM send_recipient_verifications WHERE send_uuid = ?")
      .get(created.id),
  ).toEqual({ count: 0 })
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
