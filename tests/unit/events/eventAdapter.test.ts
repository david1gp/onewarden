import { afterEach, expect, test } from "bun:test"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { eventAdapterCreate } from "../../../src/server/contexts/events/eventAdapterCreate.js"
import { eventAdapterSafeCreate } from "../../../src/server/contexts/events/eventAdapterSafeCreate.js"
import { eventPurge } from "../../../src/server/contexts/events/eventPurge.js"
import { eventType } from "../../../src/server/contexts/events/eventType.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"

const now = "2026-08-29T00:00:00.000Z"
const userUuid = "00000000-0000-4000-8000-000000000301"
const organizationUuid = "00000000-0000-4000-8000-000000000302"
const membershipUuid = "00000000-0000-4000-8000-000000000303"
const databases: DatabaseConnection[] = []

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("event adapter writes user events for the user and confirmed organizations", () => {
  const database = databaseCreate()
  const userResult = identityUserSave(database, userCreate())
  if (!userResult.success) throw new Error(userResult.errorMessage)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Events",
    "events@example.com",
  ])
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [membershipUuid, userUuid, organizationUuid, 1, "akey", 2, 0],
  )
  const adapter = eventAdapterCreate({
    clock: clockTestCreate(now),
    database,
    enabled: identityConfigCreate({ ORG_EVENTS_ENABLED: true }).ORG_EVENTS_ENABLED,
    identifier: identifierTestCreate(["00000000-0000-4000-8000-000000000304", "00000000-0000-4000-8000-000000000305"]),
    notification: { sendEvent: () => Promise.reject(new Error("notification failed")) },
  })

  adapter.userEventCreate(eventType.userLoggedIn, userUuid, { deviceType: 7, ipAddress: "192.0.2.1" })

  expect(
    database.query("SELECT event_type, user_uuid, org_uuid, org_user_uuid FROM event ORDER BY rowid").all(),
  ).toEqual([
    { event_type: eventType.userLoggedIn, user_uuid: userUuid, org_uuid: null, org_user_uuid: null },
    {
      event_type: eventType.userLoggedIn,
      user_uuid: userUuid,
      org_uuid: organizationUuid,
      org_user_uuid: membershipUuid,
    },
  ])
})

test("event adapter maps every upstream source range and ignores personal cipher events", () => {
  const database = databaseCreate()
  const adapter = eventAdapterCreate({
    clock: clockTestCreate(now),
    database,
    enabled: true,
    identifier: identifierTestCreate([
      "00000000-0000-4000-8000-000000000308",
      "00000000-0000-4000-8000-000000000309",
      "00000000-0000-4000-8000-000000000310",
      "00000000-0000-4000-8000-000000000311",
      "00000000-0000-4000-8000-000000000312",
      "00000000-0000-4000-8000-000000000315",
    ]),
  })
  const context = { deviceType: 7, ipAddress: "192.0.2.1", eventDate: now }
  adapter.organizationEventCreate(1100, "cipher-id", organizationUuid, userUuid, context)
  adapter.organizationEventCreate(1300, "collection-id", organizationUuid, userUuid, context)
  adapter.organizationEventCreate(1400, "group-id", organizationUuid, userUuid, context)
  adapter.organizationEventCreate(1500, membershipUuid, organizationUuid, userUuid, context)
  adapter.organizationEventCreate(1600, organizationUuid, organizationUuid, userUuid, context)
  adapter.organizationEventCreate(1700, "policy-id", organizationUuid, userUuid, context)
  adapter.cipherEventCreate(eventType.cipherCreated, "personal-cipher", null, userUuid, context)

  expect(
    database
      .query(
        "SELECT event_type, cipher_uuid, collection_uuid, group_uuid, org_user_uuid, org_uuid, policy_uuid FROM event",
      )
      .all(),
  ).toEqual([
    {
      cipher_uuid: "cipher-id",
      collection_uuid: null,
      event_type: 1100,
      group_uuid: null,
      org_user_uuid: null,
      org_uuid: organizationUuid,
      policy_uuid: null,
    },
    {
      cipher_uuid: null,
      collection_uuid: "collection-id",
      event_type: 1300,
      group_uuid: null,
      org_user_uuid: null,
      org_uuid: organizationUuid,
      policy_uuid: null,
    },
    {
      cipher_uuid: null,
      collection_uuid: null,
      event_type: 1400,
      group_uuid: "group-id",
      org_user_uuid: null,
      org_uuid: organizationUuid,
      policy_uuid: null,
    },
    {
      cipher_uuid: null,
      collection_uuid: null,
      event_type: 1500,
      group_uuid: null,
      org_user_uuid: membershipUuid,
      org_uuid: organizationUuid,
      policy_uuid: null,
    },
    {
      cipher_uuid: null,
      collection_uuid: null,
      event_type: 1600,
      group_uuid: null,
      org_user_uuid: null,
      org_uuid: organizationUuid,
      policy_uuid: null,
    },
    {
      cipher_uuid: null,
      collection_uuid: null,
      event_type: 1700,
      group_uuid: null,
      org_user_uuid: null,
      org_uuid: organizationUuid,
      policy_uuid: "policy-id",
    },
  ])
})

test("event notification failures and event adapter failures cannot escape the caller", async () => {
  const database = databaseCreate()
  const sentEvents: string[] = []
  const adapter = eventAdapterCreate({
    clock: clockTestCreate(now),
    database,
    enabled: true,
    identifier: identifierTestCreate(["00000000-0000-4000-8000-000000000313"]),
    notification: {
      sendEvent: (event) => {
        sentEvents.push(event.uuid)
        throw new Error("notification failed")
      },
    },
  })
  const successResult = adapter.create({ eventType: eventType.organizationUpdated, eventDate: now })
  const failedResult = adapter.create({ eventType: eventType.organizationUpdated, eventDate: "not-a-date" })

  expect(successResult.success).toBe(true)
  expect(failedResult.success).toBe(false)
  expect(sentEvents).toHaveLength(1)

  const rejectedAdapter = eventAdapterCreate({
    clock: clockTestCreate(now),
    database,
    enabled: true,
    identifier: identifierTestCreate(["00000000-0000-4000-8000-000000000314"]),
    notification: { sendEvent: () => Promise.reject(new Error("notification failed")) },
  })
  expect(rejectedAdapter.create({ eventType: eventType.organizationUpdated, eventDate: now }).success).toBe(true)
  await Promise.resolve()

  const safeAdapter = eventAdapterSafeCreate({
    create: () => {
      throw new Error("event adapter failed")
    },
    organizationEventCreate: () => {
      throw new Error("event adapter failed")
    },
    cipherEventCreate: () => {
      throw new Error("event adapter failed")
    },
    userEventCreate: () => {
      throw new Error("event adapter failed")
    },
  })
  expect(safeAdapter.create({ eventType: eventType.organizationUpdated })).toMatchObject({ success: false })
  expect(() => {
    safeAdapter.organizationEventCreate(eventType.organizationUpdated, organizationUuid, organizationUuid, userUuid, {
      deviceType: 7,
      ipAddress: "192.0.2.1",
    })
    safeAdapter.cipherEventCreate(eventType.cipherCreated, "cipher-id", organizationUuid, userUuid, {
      deviceType: 7,
      ipAddress: "192.0.2.1",
    })
    safeAdapter.userEventCreate(eventType.userLoggedIn, userUuid, { deviceType: 7, ipAddress: "192.0.2.1" })
  }).not.toThrow()
})

test("event adapter and purge are no-ops when disabled or retention is unset", () => {
  const database = databaseCreate()
  const adapter = eventAdapterCreate({
    clock: clockTestCreate(now),
    database,
    enabled: false,
    identifier: identifierTestCreate([]),
  })
  const createResult = adapter.create({ eventType: eventType.organizationUpdated })
  const purgeResult = eventPurge(database, clockTestCreate(now), undefined)

  expect(createResult).toEqual({ success: true, data: null })
  expect(purgeResult).toEqual({ success: true, data: 0 })
  expect(database.query("SELECT COUNT(*) AS count FROM event").get()).toEqual({ count: 0 })
})

test("event purge removes events older than the configured retention window", () => {
  const database = databaseCreate()
  database.run("INSERT INTO event (uuid, event_type, event_date) VALUES (?, ?, ?), (?, ?, ?)", [
    "00000000-0000-4000-8000-000000000306",
    eventType.organizationUpdated,
    "2026-08-27T23:59:59.999Z",
    "00000000-0000-4000-8000-000000000307",
    eventType.organizationUpdated,
    "2026-08-28T00:00:00.000Z",
  ])

  const result = eventPurge(database, clockTestCreate(now), 1)

  expect(result).toEqual({ success: true, data: 1 })
  expect(database.query("SELECT uuid FROM event").all()).toEqual([{ uuid: "00000000-0000-4000-8000-000000000307" }])
})

test("event purge rejects invalid retention values without throwing", () => {
  const database = databaseCreate()

  expect(eventPurge(database, clockTestCreate(now), -1).success).toBe(false)
  expect(eventPurge(database, clockTestCreate(now), Number.MAX_SAFE_INTEGER).success).toBe(false)
  expect(eventPurge(database, clockTestCreate(Number.NaN), 1).success).toBe(false)
})

test("event type aliases preserve upstream 2FA names", () => {
  expect(eventType.userUpdated2fa).toBe(eventType.userUpdatedTwoFactor)
  expect(eventType.userDisabled2fa).toBe(eventType.userDisabledTwoFactor)
  expect(eventType.userRecovered2fa).toBe(eventType.userRecoveredTwoFactor)
  expect(eventType.userFailedLogIn).toBe(eventType.userFailedLogin)
  expect(eventType.userFailedLogIn2fa).toBe(eventType.userFailedLoginTwoFactor)
  expect(eventType.userFailedLogInTwoFactor).toBe(eventType.userFailedLoginTwoFactor)
})

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function userCreate(): IdentityUser {
  return {
    uuid: userUuid,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    verifiedAt: now,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "events@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Events",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 600_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "events-stamp",
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
