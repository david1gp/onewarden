import { afterEach, expect, test } from "bun:test"
import { cipherSave } from "../../../src/server/contexts/ciphers/cipherSave.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { eventCreate } from "../../../src/server/contexts/events/eventCreate.js"
import { eventType } from "../../../src/server/contexts/events/eventType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data

const organizationUuid = "00000000-0000-4000-8000-000000000201"
const adminUuid = "00000000-0000-4000-8000-000000000202"
const memberUuid = "00000000-0000-4000-8000-000000000203"
const outsiderUuid = "00000000-0000-4000-8000-000000000204"
const adminMembershipUuid = "00000000-0000-4000-8000-000000000205"
const memberMembershipUuid = "00000000-0000-4000-8000-000000000206"
const adminDeviceUuid = "00000000-0000-4000-8000-000000000207"
const memberDeviceUuid = "00000000-0000-4000-8000-000000000208"
const outsiderDeviceUuid = "00000000-0000-4000-8000-000000000209"
const organizationCipherUuid = "00000000-0000-4000-8000-000000000210"
const personalCipherUuid = "00000000-0000-4000-8000-000000000211"
const date = "2026-08-28T00:00:00.000Z"
const databases: DatabaseConnection[] = []

function userCreate(uuid: string): IdentityUser {
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
    name: uuid,
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 600_000,
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

function deviceCreate(uuid: string, userUuid: string): IdentityDevice {
  return {
    uuid,
    createdAt: date,
    updatedAt: date,
    userUuid,
    name: "Event Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: `${uuid}-refresh`,
    twoFactorRemember: null,
  }
}

async function tokenCreate(user: IdentityUser, device: IdentityDevice): Promise<string> {
  const result = await identityTokenBundleCreate(
    user,
    device,
    "events-client",
    "https://vault.example",
    keyPair.privateKey,
    clockTestCreate(date),
    identityConfigCreate({ ORG_EVENTS_ENABLED: true }),
  )
  if (!result.success) throw new Error(result.errorMessage)
  return result.data.accessToken
}

async function contextCreate(): Promise<{
  adminToken: string
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  memberToken: string
  outsiderToken: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Events Organization",
    "events@example.com",
  ])
  const admin = userCreate(adminUuid)
  const member = userCreate(memberUuid)
  const outsider = userCreate(outsiderUuid)
  for (const user of [admin, member, outsider]) {
    const result = identityUserSave(database, user)
    if (!result.success) throw new Error(result.errorMessage)
  }
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [adminMembershipUuid, adminUuid, organizationUuid, 1, "admin-key", 2, 0],
  )
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [memberMembershipUuid, memberUuid, organizationUuid, 0, "member-key", 2, 2],
  )
  const adminDevice = deviceCreate(adminDeviceUuid, adminUuid)
  const memberDevice = deviceCreate(memberDeviceUuid, memberUuid)
  const outsiderDevice = deviceCreate(outsiderDeviceUuid, outsiderUuid)
  for (const device of [adminDevice, memberDevice, outsiderDevice]) {
    const result = identityDeviceSave(database, device, clockTestCreate(date), false)
    if (!result.success) throw new Error(result.errorMessage)
  }
  const app = serverAppCreate({
    clock: clockTestCreate(date),
    database,
    identity: {
      clock: clockTestCreate(date),
      config: identityConfigCreate({ ORG_EVENTS_ENABLED: true }),
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      identifier: identifierTestCreate([
        "00000000-0000-4000-8000-000000000212",
        "00000000-0000-4000-8000-000000000213",
      ]),
    },
  })
  return {
    adminToken: await tokenCreate(admin, adminDevice),
    app,
    database,
    memberToken: await tokenCreate(member, memberDevice),
    outsiderToken: await tokenCreate(outsider, outsiderDevice),
  }
}

function eventCreateOrThrow(
  database: DatabaseConnection,
  eventDate: string,
  eventTypeValue: number = eventType.organizationUpdated,
  fields: Record<string, string | number | null> = {},
) {
  const result = eventCreate(
    database,
    {
      eventType: eventTypeValue,
      eventDate,
      ...fields,
    },
    clockTestCreate(date),
    identifierTestCreate([crypto.randomUUID()]),
  )
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

function eventUrl(path: string, query = "start=2026-08-27T00%3A00%3A00.000Z&end=2026-08-29T00%3A00%3A00.000Z") {
  return `https://vault.example${path}?${query}`
}

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}` }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("event persistence stores the complete model and organization retrieval returns the API shape", async () => {
  const context = await contextCreate()
  const event = eventCreateOrThrow(context.database, "2026-08-28T12:00:00.000Z", eventType.cipherUpdated, {
    userUuid: adminUuid,
    organizationUuid,
    cipherUuid: organizationCipherUuid,
    collectionUuid: "collection-id",
    groupUuid: "group-id",
    organizationUserUuid: adminMembershipUuid,
    actingUserUuid: adminUuid,
    deviceType: 7,
    ipAddress: "192.0.2.1",
    policyUuid: "policy-id",
    providerUuid: "provider-id",
    providerUserUuid: "provider-user-id",
    providerOrganizationUuid: "provider-organization-id",
  })
  expect(context.database.query("SELECT COUNT(*) AS count FROM event").get()).toEqual({ count: 1 })

  const response = await context.app.request(eventUrl(`/api/organizations/${organizationUuid}/events`), {
    headers: authHeaders(context.adminToken),
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    data: [
      {
        type: eventType.cipherUpdated,
        userId: adminUuid,
        organizationId: organizationUuid,
        cipherId: organizationCipherUuid,
        collectionId: "collection-id",
        groupId: "group-id",
        organizationUserId: adminMembershipUuid,
        actingUserId: adminUuid,
        date: event.eventDate,
        deviceType: 7,
        ipAddress: "192.0.2.1",
        policyId: "policy-id",
        providerId: "provider-id",
        providerUserId: "provider-user-id",
        providerOrganizationId: "provider-organization-id",
      },
    ],
    object: "list",
    continuationToken: null,
  })
})

test("organization and user event routes enforce admin membership and member organization scope", async () => {
  const context = await contextCreate()
  eventCreateOrThrow(context.database, "2026-08-28T12:00:00.000Z", eventType.organizationUserUpdated, {
    organizationUuid,
    organizationUserUuid: memberMembershipUuid,
    userUuid: memberUuid,
    actingUserUuid: adminUuid,
  })

  const memberOrganizationResponse = await context.app.request(
    eventUrl(`/api/organizations/${organizationUuid}/events`),
    { headers: authHeaders(context.memberToken) },
  )
  expect(memberOrganizationResponse.status).toBe(401)

  const memberEventsResponse = await context.app.request(
    eventUrl(`/api/organizations/${organizationUuid}/users/${memberMembershipUuid}/events`),
    { headers: authHeaders(context.adminToken) },
  )
  expect(memberEventsResponse.status).toBe(200)
  expect((await memberEventsResponse.json()).data).toHaveLength(1)

  const unrelatedMembershipResponse = await context.app.request(
    eventUrl(`/api/organizations/${organizationUuid}/users/${outsiderUuid}/events`),
    { headers: authHeaders(context.adminToken) },
  )
  expect(unrelatedMembershipResponse.status).toBe(200)
  expect((await unrelatedMembershipResponse.json()).data).toEqual([])
})

test("event retrieval uses inclusive ranges, continuation upper bounds, and thirty-row pages", async () => {
  const context = await contextCreate()
  for (let index = 0; index < 31; index += 1) {
    eventCreateOrThrow(context.database, `2026-08-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`, undefined, {
      organizationUuid,
      userUuid: adminUuid,
    })
  }
  const firstResponse = await context.app.request(
    eventUrl(
      `/api/organizations/${organizationUuid}/events`,
      "start=2026-08-01T00%3A00%3A00.000Z&end=2026-08-31T00%3A00%3A00.000Z",
    ),
    { headers: authHeaders(context.adminToken) },
  )
  expect(firstResponse.status).toBe(200)
  const firstPage = await firstResponse.json()
  expect(firstPage.data).toHaveLength(30)
  expect(firstPage.data[0].date).toBe("2026-08-31T00:00:00.000Z")
  expect(firstPage.data[29].date).toBe("2026-08-02T00:00:00.000Z")
  expect(firstPage.continuationToken).toBe("2026-08-02T00:00:00.000Z")

  const secondResponse = await context.app.request(
    eventUrl(
      `/api/organizations/${organizationUuid}/events`,
      "start=2026-08-01T00%3A00%3A00.000Z&end=2026-08-31T00%3A00%3A00.000Z&continuationToken=2026-08-02T00%3A00%3A00.000Z",
    ),
    { headers: authHeaders(context.adminToken) },
  )
  expect(secondResponse.status).toBe(200)
  const secondPage = await secondResponse.json()
  expect(secondPage.data.map((item: { date: string }) => item.date)).toEqual([
    "2026-08-02T00:00:00.000Z",
    "2026-08-01T00:00:00.000Z",
  ])
  expect(secondPage.continuationToken).toBeNull()

  const inclusiveResponse = await context.app.request(
    eventUrl(
      `/api/organizations/${organizationUuid}/events`,
      "start=2026-08-02T00%3A00%3A00.000Z&end=2026-08-02T00%3A00%3A00.000Z",
    ),
    { headers: authHeaders(context.adminToken) },
  )
  expect((await inclusiveResponse.json()).data).toHaveLength(1)
})

test("event retrieval normalizes RFC3339 offsets before querying SQLite", async () => {
  const context = await contextCreate()
  eventCreateOrThrow(context.database, "2026-08-28T12:00:00.000Z", eventType.organizationUpdated, {
    organizationUuid,
  })

  const response = await context.app.request(
    eventUrl(
      `/api/organizations/${organizationUuid}/events`,
      "start=2026-08-28T07%3A00%3A00-05%3A00&end=2026-08-28T08%3A00%3A00-04%3A00",
    ),
    { headers: authHeaders(context.adminToken) },
  )

  expect(response.status).toBe(200)
  expect((await response.json()).data).toHaveLength(1)
})

test("event routes reject malformed UUID path parameters", async () => {
  const context = await contextCreate()
  const query = "start=2026-08-27T00%3A00%3A00.000Z&end=2026-08-29T00%3A00%3A00.000Z"

  const cipherResponse = await context.app.request(`https://vault.example/api/ciphers/not-a-uuid/events?${query}`, {
    headers: authHeaders(context.adminToken),
  })
  const memberResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/not-a-uuid/events?${query}`,
    { headers: authHeaders(context.adminToken) },
  )

  expect(cipherResponse.status).toBe(400)
  expect(memberResponse.status).toBe(400)
})

test("cipher event retrieval only exposes organization ciphers to organization admins", async () => {
  const context = await contextCreate()
  const cipherValues = {
    createdAt: date,
    updatedAt: date,
    key: null,
    type: 1,
    name: "Event Cipher",
    notes: null,
    fields: null,
    data: "{}",
    passwordHistory: null,
    deletedAt: null,
    reprompt: null,
  }
  for (const cipher of [
    { ...cipherValues, uuid: organizationCipherUuid, userUuid: null, organizationUuid },
    { ...cipherValues, uuid: personalCipherUuid, userUuid: adminUuid, organizationUuid: null },
  ]) {
    const result = cipherSave(context.database, cipher)
    if (!result.success) throw new Error(result.errorMessage)
  }
  eventCreateOrThrow(context.database, date, eventType.cipherCreated, {
    organizationUuid,
    cipherUuid: organizationCipherUuid,
    actingUserUuid: adminUuid,
  })
  eventCreateOrThrow(context.database, date, eventType.cipherCreated, {
    cipherUuid: personalCipherUuid,
    actingUserUuid: adminUuid,
  })

  const organizationCipherResponse = await context.app.request(
    eventUrl(`/api/ciphers/${organizationCipherUuid}/events`),
    { headers: authHeaders(context.adminToken) },
  )
  expect((await organizationCipherResponse.json()).data).toHaveLength(1)

  const personalCipherResponse = await context.app.request(eventUrl(`/api/ciphers/${personalCipherUuid}/events`), {
    headers: authHeaders(context.adminToken),
  })
  expect((await personalCipherResponse.json()).data).toEqual([])

  const memberCipherResponse = await context.app.request(eventUrl(`/api/ciphers/${organizationCipherUuid}/events`), {
    headers: authHeaders(context.memberToken),
  })
  expect((await memberCipherResponse.json()).data).toEqual([])
})

test("disabled organization events preserve the authenticated empty-list response", async () => {
  const context = await contextCreate()
  eventCreateOrThrow(context.database, date, eventType.organizationUpdated, { organizationUuid })
  const disabledApp = serverAppCreate({
    clock: clockTestCreate(date),
    database: context.database,
    identity: {
      clock: clockTestCreate(date),
      config: identityConfigCreate(),
      database: context.database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      identifier: identifierTestCreate([]),
    },
  })
  const response = await disabledApp.request(eventUrl(`/api/organizations/${organizationUuid}/events`), {
    headers: authHeaders(context.adminToken),
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ data: [], object: "list", continuationToken: null })
})

test("event collection records user events with the submitted event date", async () => {
  const context = await contextCreate()
  const response = await context.app.request("https://vault.example/events/collect", {
    body: JSON.stringify([{ type: eventType.userClientExportedVault, date: "2026-08-27T12:00:00.000Z" }]),
    headers: { ...authHeaders(context.memberToken), "content-type": "application/json" },
    method: "POST",
  })

  expect(response.status).toBe(200)
  expect(
    context.database.query("SELECT event_type, user_uuid, org_uuid, event_date FROM event ORDER BY rowid").all(),
  ).toEqual([
    {
      event_date: "2026-08-27T12:00:00.000Z",
      event_type: eventType.userClientExportedVault,
      org_uuid: null,
      user_uuid: memberUuid,
    },
    {
      event_date: "2026-08-27T12:00:00.000Z",
      event_type: eventType.userClientExportedVault,
      org_uuid: organizationUuid,
      user_uuid: memberUuid,
    },
  ])
})

test("disabled event collection still requires authentication", async () => {
  const context = await contextCreate()
  const disabledApp = serverAppCreate({
    clock: clockTestCreate(date),
    database: context.database,
    identity: {
      clock: clockTestCreate(date),
      config: identityConfigCreate(),
      database: context.database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      identifier: identifierTestCreate([]),
    },
  })

  const response = await disabledApp.request("https://vault.example/events/collect", {
    body: JSON.stringify([{ type: eventType.userLoggedIn, date }]),
    headers: { "content-type": "application/json" },
    method: "POST",
  })

  expect(response.status).toBe(401)
})

test("successful organization updates emit organization events without changing the API response", async () => {
  const context = await contextCreate()
  const response = await context.app.request(`https://vault.example/api/organizations/${organizationUuid}`, {
    body: JSON.stringify({ billingEmail: "updated@example.com", name: "Updated Events Organization" }),
    headers: { ...authHeaders(context.adminToken), "content-type": "application/json" },
    method: "PUT",
  })

  expect(response.status).toBe(200)
  expect(context.database.query("SELECT event_type, org_uuid, act_user_uuid FROM event").all()).toEqual([
    { act_user_uuid: adminUuid, event_type: eventType.organizationUpdated, org_uuid: organizationUuid },
  ])
})
