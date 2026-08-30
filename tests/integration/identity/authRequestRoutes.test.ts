import { afterEach, expect, test } from "bun:test"
import type { EventAdapter } from "../../../src/server/contexts/events/eventAdapter.js"
import { eventType } from "../../../src/server/contexts/events/eventType.js"
import type { IdentityAuthRequest } from "../../../src/server/contexts/identity/identityAuthRequest.js"
import { identityAuthRequestSave } from "../../../src/server/contexts/identity/identityAuthRequestSave.js"
import { identityAuthRequestToJson } from "../../../src/server/contexts/identity/identityAuthRequestToJson.js"
import type { IdentityClientIpConfiguration } from "../../../src/server/contexts/identity/identityClientIpConfiguration.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { NotificationAdapter } from "../../../src/server/contexts/notifications/notificationAdapter.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { identityTestUserCreate } from "../../helpers/identityTestUserCreate.js"

type AuthRequestContext = {
  app: ReturnType<typeof serverAppCreate>
  anonymousAuthResponses: Array<{ authRequestUuid: string; userUuid: string }>
  database: DatabaseConnection
  eventCalls: Array<{ context: { deviceType: number; ipAddress: string }; type: number; userUuid: string }>
  notificationUpdates: Array<{ update: Record<string, unknown>; userIds: string[] }>
  token: string
  user: IdentityUser
}

const databases: DatabaseConnection[] = []
const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data

function deviceCreate(userUuid: string, uuid: string, type = 7): IdentityDevice {
  return {
    uuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: `${uuid} name`,
    type,
    pushUuid: `${uuid}-push`,
    pushToken: null,
    refreshToken: `${uuid}-refresh`,
    twoFactorRemember: null,
  }
}

function notificationAdapterCreate(
  updates: Array<{ update: Record<string, unknown>; userIds: string[] }>,
): NotificationAdapter {
  return {
    sendCipherUpdate: () => undefined,
    sendFolderUpdate: () => undefined,
    sendUpdate: (userIds, update) => updates.push({ update: { ...update }, userIds: [...userIds] }),
    sendUserUpdate: () => undefined,
  }
}

function eventAdapterCreate(
  calls: Array<{ context: { deviceType: number; ipAddress: string }; type: number; userUuid: string }>,
): EventAdapter {
  return {
    cipherEventCreate: () => undefined,
    create: () => resultCreate(null),
    organizationEventCreate: () => undefined,
    userEventCreate: (type, userUuid, context) => calls.push({ context, type, userUuid }),
  }
}

async function contextCreate(clientIp?: IdentityClientIpConfiguration): Promise<AuthRequestContext> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)

  const user = identityTestUserCreate("auth-request-user", { name: "Auth Request User", passwordIterations: 100_000 })
  const userSaveResult = identityUserSave(database, user)
  if (!userSaveResult.success) throw new Error(userSaveResult.errorMessage)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const userDevice = deviceCreate(user.uuid, "request-device")
  const deviceSaveResult = identityDeviceSave(database, userDevice, clock, false)
  if (!deviceSaveResult.success) throw new Error(deviceSaveResult.errorMessage)
  const otherUser = identityTestUserCreate("other-auth-request-user", {
    name: "Other Auth Request User",
    passwordIterations: 100_000,
  })
  const otherUserSaveResult = identityUserSave(database, otherUser)
  if (!otherUserSaveResult.success) throw new Error(otherUserSaveResult.errorMessage)
  const otherDevice = deviceCreate(otherUser.uuid, "other-device")
  const otherDeviceSaveResult = identityDeviceSave(database, otherDevice, clock, false)
  if (!otherDeviceSaveResult.success) throw new Error(otherDeviceSaveResult.errorMessage)

  const eventCalls: AuthRequestContext["eventCalls"] = []
  const anonymousAuthResponses: AuthRequestContext["anonymousAuthResponses"] = []
  const notificationUpdates: AuthRequestContext["notificationUpdates"] = []
  const config = identityConfigCreate({ ORG_EVENTS_ENABLED: true })
  const app = serverAppCreate({
    clock,
    database,
    events: { adapter: eventAdapterCreate(eventCalls) },
    identity: {
      clientIp,
      config,
      database,
      anonymousAuthRequestResponseSend: (userUuid, authRequestUuid) =>
        anonymousAuthResponses.push({ authRequestUuid, userUuid }),
      identifier: { uuid: () => "auth-request-id" },
      notification: notificationAdapterCreate(notificationUpdates),
      privateKey: keyPair.privateKey,
      publicOrigin: "https://vault.example/",
      rateLimiter: { check: () => resultCreate(undefined) },
      publicKey: keyPair.publicKey,
    },
  })
  const tokenResult = await identityTokenBundleCreate(
    user,
    userDevice,
    "auth-request-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  return {
    anonymousAuthResponses,
    app,
    database,
    eventCalls,
    notificationUpdates,
    token: tokenResult.data.accessToken,
    user,
  }
}

async function requestCreate(
  context: AuthRequestContext,
  body: unknown,
  headers: Record<string, string> = {},
  remoteIpAddress?: string,
): Promise<Response> {
  const request = new Request("https://vault.example/api/auth-requests", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "device-type": "7", ...headers },
    method: "POST",
  })
  return context.app.fetch(request, remoteIpAddress === undefined ? undefined : { remoteIpAddress })
}

function errorBody(message: string): Record<string, unknown> {
  return {
    message,
    validationErrors: { "": [message] },
    errorModel: { message, object: "error" },
    error: "",
    error_description: "",
    exceptionMessage: null,
    exceptionStackTrace: null,
    innerExceptionMessage: null,
    object: "error",
  }
}

function authRequestRecordCreate(overrides: Partial<IdentityAuthRequest> = {}): IdentityAuthRequest {
  return {
    uuid: "auth-request-record",
    userUuid: "auth-request-user",
    organizationUuid: null,
    requestDeviceIdentifier: "request-device",
    deviceType: 7,
    requestIp: "192.0.2.10",
    responseDeviceId: null,
    accessCode: "access-code",
    publicKey: "public-key",
    encKey: null,
    masterPasswordHash: null,
    approved: null,
    creationDate: "2026-08-28T00:00:00.000Z",
    responseDate: null,
    authenticationDate: null,
    ...overrides,
  }
}

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

function authRequestPersist(context: AuthRequestContext, request: IdentityAuthRequest): void {
  const result = identityAuthRequestSave(context.database, request)
  if (!result.success) throw new Error(result.errorMessage)
}

async function requestRespond(
  context: AuthRequestContext,
  authRequestUuid: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return context.app.request(`https://vault.example/api/auth-requests/${authRequestUuid}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...authHeaders(context.token), ...headers },
    method: "PUT",
  })
}

async function requestResponse(
  context: AuthRequestContext,
  authRequestUuid: string,
  accessCode: string,
  headers: Record<string, string> = {},
  remoteIpAddress?: string,
): Promise<Response> {
  const query = new URLSearchParams({ code: accessCode })
  const request = new Request(
    `https://vault.example/api/auth-requests/${authRequestUuid}/response?${query.toString()}`,
    { headers: { "device-type": "7", ...headers }, method: "GET" },
  )
  return context.app.fetch(request, remoteIpAddress === undefined ? undefined : { remoteIpAddress })
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("anonymous auth-request creation persists the pending record and emits the upstream notification and event", async () => {
  const context = await contextCreate()
  const response = await requestCreate(
    context,
    {
      accessCode: "access-code",
      deviceIdentifier: "request-device",
      email: "AUTH-REQUEST-USER@EXAMPLE.COM",
      publicKey: "public-key",
    },
    { "x-real-ip": "192.0.2.10" },
    "127.0.0.1",
  )

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    id: "auth-request-id",
    publicKey: "public-key",
    requestDeviceType: "macOS",
    requestIpAddress: "192.0.2.10",
    key: null,
    masterPasswordHash: null,
    creationDate: "2026-08-28T00:00:00.000Z",
    responseDate: null,
    requestApproved: false,
    origin: "https://vault.example",
    object: "auth-request",
  })
  expect(
    context.database
      .query(
        "SELECT user_uuid, request_device_identifier, device_type, request_ip, access_code, public_key, approved FROM auth_requests",
      )
      .all(),
  ).toEqual([
    {
      user_uuid: "auth-request-user",
      request_device_identifier: "request-device",
      device_type: 7,
      request_ip: "192.0.2.10",
      access_code: "access-code",
      public_key: "public-key",
      approved: null,
    },
  ])
  expect(context.notificationUpdates).toEqual([
    {
      userIds: ["auth-request-user"],
      update: {
        contextId: "request-device",
        payload: { Id: "auth-request-id", UserId: "auth-request-user" },
        type: 15,
      },
    },
  ])
  expect(context.eventCalls).toEqual([
    {
      context: { deviceType: 7, ipAddress: "192.0.2.10" },
      type: eventType.userRequestedDeviceApproval,
      userUuid: "auth-request-user",
    },
  ])
})

test("anonymous auth-request creation ignores spoofed IP headers from an untrusted remote", async () => {
  const context = await contextCreate()
  const response = await requestCreate(
    context,
    {
      accessCode: "access-code",
      deviceIdentifier: "request-device",
      email: "auth-request-user@example.com",
      publicKey: "public-key",
    },
    { "x-forwarded-for": "198.51.100.10", "x-real-ip": "203.0.113.10" },
    "8.8.8.8",
  )

  expect(response.status).toBe(200)
  expect((await response.json()).requestIpAddress).toBe("8.8.8.8")
  expect(context.database.query("SELECT request_ip FROM auth_requests").get()).toEqual({ request_ip: "8.8.8.8" })
  expect(context.eventCalls[0]?.context).toEqual({ deviceType: 7, ipAddress: "8.8.8.8" })
})

test("anonymous auth-request creation uses the configured IP header from a trusted proxy", async () => {
  const context = await contextCreate({ header: "CF-Connecting-IP", trustedProxies: "10.0.0.0/8" })
  const response = await requestCreate(
    context,
    {
      accessCode: "access-code",
      deviceIdentifier: "request-device",
      email: "auth-request-user@example.com",
      publicKey: "public-key",
    },
    { "cf-connecting-ip": "198.51.100.10", "x-real-ip": "203.0.113.10" },
    "10.20.30.40",
  )

  expect(response.status).toBe(200)
  expect((await response.json()).requestIpAddress).toBe("198.51.100.10")
  expect(context.database.query("SELECT request_ip FROM auth_requests").get()).toEqual({ request_ip: "198.51.100.10" })
  expect(context.eventCalls[0]?.context).toEqual({ deviceType: 7, ipAddress: "198.51.100.10" })
})

test("anonymous auth-request creation falls back when the test request has no server remote IP", async () => {
  const context = await contextCreate()
  const response = await requestCreate(
    context,
    {
      accessCode: "access-code",
      deviceIdentifier: "request-device",
      email: "auth-request-user@example.com",
      publicKey: "public-key",
    },
    { "x-forwarded-for": "198.51.100.10", "x-real-ip": "203.0.113.10" },
  )

  expect(response.status).toBe(200)
  expect((await response.json()).requestIpAddress).toBe("0.0.0.0")
  expect(context.database.query("SELECT request_ip FROM auth_requests").get()).toEqual({ request_ip: "0.0.0.0" })
  expect(context.eventCalls[0]?.context).toEqual({ deviceType: 7, ipAddress: "0.0.0.0" })
})

test("auth-request creation keeps user and device failures non-enumerating", async () => {
  const context = await contextCreate()
  const body = {
    accessCode: "access-code",
    deviceIdentifier: "request-device",
    email: "auth-request-user@example.com",
    publicKey: "public-key",
  }
  const unknownUser = await requestCreate(context, { ...body, email: "missing@example.com" })
  const wrongDevice = await requestCreate(context, { ...body, deviceIdentifier: "other-device" })
  const wrongType = await requestCreate(context, body, { "device-type": "6" })

  for (const response of [unknownUser, wrongDevice, wrongType]) {
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(errorBody("AuthRequest doesn't exist"))
  }
  expect(context.database.query("SELECT COUNT(*) AS count FROM auth_requests").get()).toEqual({ count: 0 })
})

test("auth-request creation requires the exact camelCase request schema", async () => {
  const context = await contextCreate()
  const response = await requestCreate(context, {
    AccessCode: "access-code",
    DeviceIdentifier: "request-device",
    Email: "auth-request-user@example.com",
    PublicKey: "public-key",
  })

  expect(response.status).toBe(400)
  expect((await response.json()).message).toBe("Invalid request.")
  expect(context.database.query("SELECT COUNT(*) AS count FROM auth_requests").get()).toEqual({ count: 0 })
})

test("authenticated auth-request inspection returns the full object and hides missing and cross-user records identically", async () => {
  const context = await contextCreate()
  const request = authRequestRecordCreate({ uuid: "owned-auth-request" })
  authRequestPersist(context, request)

  const ownedResponse = await context.app.request("https://vault.example/api/auth-requests/owned-auth-request", {
    headers: authHeaders(context.token),
  })
  expect(ownedResponse.status).toBe(200)
  expect(await ownedResponse.json()).toEqual(identityAuthRequestToJson(request, "https://vault.example"))

  const foreignRequest = authRequestRecordCreate({
    uuid: "foreign-auth-request",
    userUuid: "other-auth-request-user",
  })
  authRequestPersist(context, foreignRequest)

  const missingResponse = await context.app.request("https://vault.example/api/auth-requests/missing-auth-request", {
    headers: authHeaders(context.token),
  })
  const foreignResponse = await context.app.request("https://vault.example/api/auth-requests/foreign-auth-request", {
    headers: authHeaders(context.token),
  })
  expect(missingResponse.status).toBe(400)
  expect(foreignResponse.status).toBe(missingResponse.status)
  const missingBody = await missingResponse.json()
  const foreignBody = await foreignResponse.json()
  expect(foreignBody).toEqual(missingBody)
  expect(missingBody).toEqual(errorBody("AuthRequest doesn't exist"))
})

test("authenticated legacy and pending auth-request lists preserve upstream order, ownership, filtering, envelopes, and origin", async () => {
  const context = await contextCreate()
  const pendingOlder = authRequestRecordCreate({ uuid: "pending-older" })
  const approved = authRequestRecordCreate({ uuid: "approved-request", approved: true })
  const pendingNewer = authRequestRecordCreate({
    uuid: "pending-newer",
    creationDate: "2026-08-28T00:02:00.000Z",
  })
  const rejected = authRequestRecordCreate({ uuid: "rejected-request", approved: false })
  const foreignPending = authRequestRecordCreate({
    uuid: "foreign-pending",
    userUuid: "other-auth-request-user",
  })
  for (const request of [pendingOlder, approved, pendingNewer, rejected, foreignPending])
    authRequestPersist(context, request)

  const expected = {
    continuationToken: null,
    data: [pendingOlder, pendingNewer].map((request) => identityAuthRequestToJson(request, "https://vault.example")),
    object: "list",
  }
  const legacyResponse = await context.app.request("https://vault.example/api/auth-requests", {
    headers: authHeaders(context.token),
  })
  const pendingResponse = await context.app.request("https://vault.example/api/auth-requests/pending", {
    headers: authHeaders(context.token),
  })

  expect(legacyResponse.status).toBe(200)
  expect(pendingResponse.status).toBe(200)
  expect(await legacyResponse.json()).toEqual(expected)
  expect(await pendingResponse.json()).toEqual(expected)
})

test("authenticated auth-request approval persists the response, emits both upstream notifications, and logs responder context", async () => {
  const context = await contextCreate()
  const request = authRequestRecordCreate({ uuid: "approval-auth-request", requestDeviceIdentifier: "new-device" })
  authRequestPersist(context, request)

  const response = await requestRespond(context, request.uuid, {
    deviceIdentifier: "request-device",
    key: "encrypted-key",
    masterPasswordHash: "master-password-hash",
    requestApproved: true,
  })

  const approved = {
    ...request,
    approved: true,
    encKey: "encrypted-key",
    masterPasswordHash: "master-password-hash",
    responseDate: "2026-08-28T00:00:00.000Z",
    responseDeviceId: "request-device",
  }
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(identityAuthRequestToJson(approved, "https://vault.example"))
  expect(
    context.database
      .query("SELECT response_device_id, enc_key, master_password_hash, approved, response_date FROM auth_requests")
      .all(),
  ).toEqual([
    {
      response_device_id: "request-device",
      enc_key: "encrypted-key",
      master_password_hash: "master-password-hash",
      approved: 1,
      response_date: "2026-08-28T00:00:00.000Z",
    },
  ])
  expect(context.anonymousAuthResponses).toEqual([
    { authRequestUuid: "approval-auth-request", userUuid: "auth-request-user" },
  ])
  expect(context.notificationUpdates).toEqual([
    {
      userIds: ["auth-request-user"],
      update: {
        contextId: "request-device",
        payload: { Id: "approval-auth-request", UserId: "auth-request-user" },
        type: 16,
      },
    },
  ])
  expect(context.eventCalls).toEqual([
    {
      context: { deviceType: 7, ipAddress: "0.0.0.0" },
      type: eventType.organizationUserApprovedAuthRequest,
      userUuid: "auth-request-user",
    },
  ])
})

test("authenticated auth-request rejection deletes the request but returns the upstream in-memory response without notifications", async () => {
  const context = await contextCreate()
  const request = authRequestRecordCreate({ uuid: "rejection-auth-request" })
  authRequestPersist(context, request)

  const response = await requestRespond(context, request.uuid, {
    deviceIdentifier: "request-device",
    key: "ignored-key",
    masterPasswordHash: null,
    requestApproved: false,
  })

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    ...identityAuthRequestToJson(request, "https://vault.example"),
    responseDate: "2026-08-28T00:00:00.000Z",
  })
  expect(context.database.query("SELECT COUNT(*) AS count FROM auth_requests").get()).toEqual({ count: 0 })
  expect(context.anonymousAuthResponses).toEqual([])
  expect(context.notificationUpdates).toEqual([])
  expect(context.eventCalls).toEqual([
    {
      context: { deviceType: 7, ipAddress: "0.0.0.0" },
      type: eventType.organizationUserRejectedAuthRequest,
      userUuid: "auth-request-user",
    },
  ])
})

test("anonymous auth-request response polling returns the exact full pending and approved objects without bearer authentication", async () => {
  const context = await contextCreate()
  const pending = authRequestRecordCreate({ uuid: "11111111-1111-4111-8111-111111111111" })
  const approved = authRequestRecordCreate({
    uuid: "22222222-2222-4222-8222-222222222222",
    approved: true,
    encKey: "encrypted-key",
    masterPasswordHash: "master-password-hash",
    responseDate: "2026-08-28T00:01:00.000Z",
    responseDeviceId: "response-device",
  })
  authRequestPersist(context, pending)
  authRequestPersist(context, approved)

  const pendingResponse = await requestResponse(
    context,
    pending.uuid,
    pending.accessCode,
    { "x-real-ip": pending.requestIp },
    "127.0.0.1",
  )
  const approvedResponse = await requestResponse(
    context,
    approved.uuid,
    approved.accessCode,
    { "x-real-ip": approved.requestIp },
    "127.0.0.1",
  )

  expect(pendingResponse.status).toBe(200)
  expect(await pendingResponse.json()).toEqual(identityAuthRequestToJson(pending, "https://vault.example"))
  expect(approvedResponse.status).toBe(200)
  expect(await approvedResponse.json()).toEqual(identityAuthRequestToJson(approved, "https://vault.example"))
})

test("anonymous auth-request response polling serializes persisted rejection state and keeps mismatches generic", async () => {
  const context = await contextCreate()
  const rejected = authRequestRecordCreate({
    uuid: "99999999-9999-4999-8999-999999999999",
    approved: false,
  })
  authRequestPersist(context, rejected)

  const valid = await requestResponse(
    context,
    rejected.uuid,
    rejected.accessCode,
    { "x-real-ip": rejected.requestIp },
    "127.0.0.1",
  )
  const wrongDevice = await requestResponse(
    context,
    rejected.uuid,
    rejected.accessCode,
    { "device-type": "6", "x-real-ip": rejected.requestIp },
    "127.0.0.1",
  )
  const wrongIp = await requestResponse(
    context,
    rejected.uuid,
    rejected.accessCode,
    { "x-real-ip": "192.0.2.11" },
    "127.0.0.1",
  )
  const wrongCode = await requestResponse(
    context,
    rejected.uuid,
    `${rejected.accessCode}-extra`,
    { "x-real-ip": rejected.requestIp },
    "127.0.0.1",
  )

  expect(valid.status).toBe(200)
  expect(await valid.json()).toEqual(identityAuthRequestToJson(rejected, "https://vault.example"))
  for (const response of [wrongDevice, wrongIp, wrongCode]) {
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(errorBody("AuthRequest doesn't exist"))
  }
})

test("anonymous auth-request response polling uses one generic missing error for absent and mismatched requests", async () => {
  const context = await contextCreate()
  const request = authRequestRecordCreate({ uuid: "33333333-3333-4333-8333-333333333333" })
  authRequestPersist(context, request)

  const missing = await requestResponse(
    context,
    "44444444-4444-4444-8444-444444444444",
    request.accessCode,
    { "x-real-ip": request.requestIp },
    "127.0.0.1",
  )
  const wrongDevice = await requestResponse(
    context,
    request.uuid,
    request.accessCode,
    { "device-type": "6", "x-real-ip": request.requestIp },
    "127.0.0.1",
  )
  const wrongIp = await requestResponse(
    context,
    request.uuid,
    request.accessCode,
    { "x-real-ip": "192.0.2.11" },
    "127.0.0.1",
  )
  const wrongCode = await requestResponse(
    context,
    request.uuid,
    `${request.accessCode}-extra`,
    { "x-real-ip": request.requestIp },
    "127.0.0.1",
  )
  for (const response of [missing, wrongDevice, wrongIp, wrongCode]) {
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual(errorBody("AuthRequest doesn't exist"))
  }
})

test("anonymous auth-request response polling requires the code query and a UUID-only path", async () => {
  const context = await contextCreate()
  const request = authRequestRecordCreate({ uuid: "55555555-5555-4555-8555-555555555555" })
  authRequestPersist(context, request)

  const missingCode = await context.app.request(`https://vault.example/api/auth-requests/${request.uuid}/response`, {
    headers: { "device-type": "7", "x-real-ip": request.requestIp },
  })
  const invalidUuid = await requestResponse(
    context,
    "not-an-auth-request-uuid",
    request.accessCode,
    { "x-real-ip": request.requestIp },
    "127.0.0.1",
  )

  expect(missingCode.status).toBe(400)
  expect((await missingCode.json()).message).toBe("Invalid request.")
  expect(invalidUuid.status).toBe(400)
  expect((await invalidUuid.json()).message).toBe("Invalid request.")
})

test("anonymous auth-request response polling resolves the client IP through the trusted proxy configuration", async () => {
  const context = await contextCreate({ header: "CF-Connecting-IP", trustedProxies: "10.0.0.0/8" })
  const request = authRequestRecordCreate({
    uuid: "66666666-6666-4666-8666-666666666666",
    requestIp: "198.51.100.10",
  })
  authRequestPersist(context, request)

  const trusted = await requestResponse(
    context,
    request.uuid,
    request.accessCode,
    { "cf-connecting-ip": request.requestIp },
    "10.20.30.40",
  )
  const spoofed = await requestResponse(
    context,
    request.uuid,
    request.accessCode,
    { "cf-connecting-ip": request.requestIp },
    "8.8.8.8",
  )

  expect(trusted.status).toBe(200)
  expect(await trusted.json()).toEqual(identityAuthRequestToJson(request, "https://vault.example"))
  expect(spoofed.status).toBe(400)
  expect(await spoofed.json()).toEqual(errorBody("AuthRequest doesn't exist"))
})

test("anonymous auth-request response polling treats a rejected request as missing after the authenticated rejection deletes it", async () => {
  const context = await contextCreate()
  const request = authRequestRecordCreate({ uuid: "77777777-7777-4777-8777-777777777777" })
  authRequestPersist(context, request)

  const rejection = await requestRespond(context, request.uuid, {
    deviceIdentifier: "request-device",
    key: "ignored-key",
    masterPasswordHash: null,
    requestApproved: false,
  })
  const response = await requestResponse(
    context,
    request.uuid,
    request.accessCode,
    { "x-real-ip": request.requestIp },
    "127.0.0.1",
  )

  expect(rejection.status).toBe(200)
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual(errorBody("AuthRequest doesn't exist"))
})

test("authenticated auth-request response parsing ignores unknown properties but rejects misspelled or missing required fields", async () => {
  const context = await contextCreate()
  const body = {
    deviceIdentifier: "request-device",
    key: "encrypted-key",
    masterPasswordHash: null,
    requestApproved: true,
  }
  const acceptedRequest = authRequestRecordCreate({ uuid: "response-unknown-property-request" })
  authRequestPersist(context, acceptedRequest)

  const acceptedResponse = await requestRespond(context, acceptedRequest.uuid, { ...body, unexpected: true })
  expect(acceptedResponse.status).toBe(200)

  const invalidBodies = [
    { DeviceIdentifier: body.deviceIdentifier, key: body.key, masterPasswordHash: null, requestApproved: true },
    { deviceIdentifier: body.deviceIdentifier, key: body.key, requestApproved: true },
  ]
  for (const [index, invalidBody] of invalidBodies.entries()) {
    const invalidRequest = authRequestRecordCreate({ uuid: `response-invalid-body-request-${index}` })
    authRequestPersist(context, invalidRequest)
    const invalidResponse = await requestRespond(context, invalidRequest.uuid, invalidBody)
    expect(invalidResponse.status).toBe(400)
    expect((await invalidResponse.json()).message).toBe("Invalid request.")
  }
})

test("authenticated auth-request responses require the camelCase body, owned pending request, and responder device", async () => {
  const context = await contextCreate()
  const request = authRequestRecordCreate({ uuid: "response-validation-request" })
  authRequestPersist(context, request)
  const body = {
    deviceIdentifier: "request-device",
    key: "encrypted-key",
    masterPasswordHash: null,
    requestApproved: true,
  }

  const wrongDeviceResponse = await requestRespond(context, request.uuid, { ...body, deviceIdentifier: "other-device" })
  expect(wrongDeviceResponse.status).toBe(400)
  expect(await wrongDeviceResponse.json()).toEqual(errorBody("AuthRequest doesn't exist"))

  const foreignRequest = authRequestRecordCreate({
    uuid: "foreign-response-request",
    userUuid: "other-auth-request-user",
  })
  authRequestPersist(context, foreignRequest)
  const foreignResponse = await requestRespond(context, foreignRequest.uuid, body)
  expect(foreignResponse.status).toBe(400)
  expect(await foreignResponse.json()).toEqual(errorBody("AuthRequest doesn't exist"))

  const resolvedRequest = authRequestRecordCreate({ uuid: "resolved-response-request", approved: true })
  authRequestPersist(context, resolvedRequest)
  const resolvedResponse = await requestRespond(context, resolvedRequest.uuid, body)
  expect(resolvedResponse.status).toBe(400)
  expect(await resolvedResponse.json()).toEqual(
    errorBody("An authentication request with the same device already exists"),
  )
})
