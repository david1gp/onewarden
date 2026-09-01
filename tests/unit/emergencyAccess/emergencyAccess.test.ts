import { afterEach, expect, test } from "bun:test"
import type { EmergencyAccess } from "../../../src/server/contexts/emergencyAccess/emergencyAccess.js"
import { emergencyAccessFindByUuidAndGrantor } from "../../../src/server/contexts/emergencyAccess/emergencyAccessFindByUuidAndGrantor.js"
import { emergencyAccessInviteTokenCreate } from "../../../src/server/contexts/emergencyAccess/emergencyAccessInviteTokenCreate.js"
import { emergencyAccessInviteTokenDecode } from "../../../src/server/contexts/emergencyAccess/emergencyAccessInviteTokenDecode.js"
import { emergencyAccessNotificationDateUpdate } from "../../../src/server/contexts/emergencyAccess/emergencyAccessNotificationDateUpdate.js"
import { emergencyAccessReminderRun } from "../../../src/server/contexts/emergencyAccess/emergencyAccessReminderRun.js"
import { emergencyAccessSave } from "../../../src/server/contexts/emergencyAccess/emergencyAccessSave.js"
import { emergencyAccessStatusUpdate } from "../../../src/server/contexts/emergencyAccess/emergencyAccessStatusUpdate.js"
import { emergencyAccessTimeoutRun } from "../../../src/server/contexts/emergencyAccess/emergencyAccessTimeoutRun.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { emergencyAccess } from "../../../src/server/database/schema/emergencyAccess.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

function userCreate(uuid: string, email: string): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-28T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email,
    emailNew: null,
    emailNewToken: null,
    name: uuid,
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

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("emergency access invitation tokens preserve the upstream claims and issuer", async () => {
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const tokenResult = await emergencyAccessInviteTokenCreate(
    "grantee",
    "grantee@example.com",
    "emergency-1",
    "Grantor",
    "grantor@example.com",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    120,
  )
  expect(tokenResult.success).toBe(true)
  if (!tokenResult.success) return
  const claimsResult = await emergencyAccessInviteTokenDecode(
    tokenResult.data,
    "https://vault.example",
    keyPair.publicKey,
    clock,
  )
  expect(claimsResult).toEqual({
    success: true,
    data: {
      email: "grantee@example.com",
      emergencyAccessId: "emergency-1",
      grantorName: "Grantor",
      grantorEmail: "grantor@example.com",
      subject: "grantee",
    },
  })
})

test("timeout runs before reminder eligibility and mail/notification adapters are deterministic", async () => {
  const database = databaseCreate()
  const grantor = userCreate("grantor", "grantor@example.com")
  const grantee = userCreate("grantee", "grantee@example.com")
  expect(identityUserSave(database, grantor).success).toBe(true)
  expect(identityUserSave(database, grantee).success).toBe(true)
  const clock = clockTestCreate("2026-08-29T00:00:00.000Z")
  const access: EmergencyAccess = {
    uuid: "emergency-1",
    grantorUuid: grantor.uuid,
    granteeUuid: grantee.uuid,
    email: null,
    keyEncrypted: "encrypted-key",
    type: 0,
    status: 3,
    waitTimeDays: 1,
    recoveryInitiatedAt: "2026-08-28T00:00:00.000Z",
    lastNotificationAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    createdAt: "2026-08-27T00:00:00.000Z",
  }
  expect(emergencyAccessSave(database, access, access.updatedAt).success).toBe(true)
  const mail = identityMailAdapterCreate(clock)
  const notifications: string[] = []
  const options = {
    clock,
    config: identityConfigCreate({ MAIL_ENABLED: true }),
    database,
    mail,
    notification: {
      sendEmergencyAccessUpdate: (event: { event: string }) => {
        notifications.push(event.event)
      },
    },
  }
  expect(await emergencyAccessTimeoutRun(options)).toEqual({ success: true, data: 1 })
  expect(await emergencyAccessReminderRun(options)).toEqual({ success: true, data: 0 })
  expect(mail.messages.map((message) => message.kind)).toEqual([
    "emergencyAccessRecoveryTimedOut",
    "emergencyAccessRecoveryApproved",
  ])
  expect(notifications).toEqual(["timedOut"])
  const row = database.drizzle.select({ status: emergencyAccess.status }).from(emergencyAccess).limit(1).get()
  expect(row).toEqual({ status: 4 })
})

test("emergency access persistence preserves null projections and compare-and-set updates", () => {
  const database = databaseCreate()
  const grantor = userCreate("grantor-persistence", "grantor-persistence@example.com")
  expect(identityUserSave(database, grantor).success).toBe(true)
  const access: EmergencyAccess = {
    uuid: "emergency-persistence",
    grantorUuid: grantor.uuid,
    granteeUuid: null,
    email: "invitee@example.com",
    keyEncrypted: null,
    type: 0,
    status: 0,
    waitTimeDays: 7,
    recoveryInitiatedAt: null,
    lastNotificationAt: null,
    updatedAt: "2026-08-28T00:00:00.000Z",
    createdAt: "2026-08-27T00:00:00.000Z",
  }

  expect(emergencyAccessSave(database, access, access.updatedAt)).toEqual({ success: true, data: undefined })
  expect(emergencyAccessFindByUuidAndGrantor(database, access.uuid, grantor.uuid)).toEqual({
    success: true,
    data: access,
  })

  const nextNotificationAt = "2026-08-28T01:00:00.000Z"
  expect(emergencyAccessNotificationDateUpdate(database, access, nextNotificationAt)).toEqual({
    success: true,
    data: true,
  })
  const staleNotificationAccess = { ...access, lastNotificationAt: null }
  expect(emergencyAccessNotificationDateUpdate(database, staleNotificationAccess, "2026-08-28T02:00:00.000Z")).toEqual({
    success: true,
    data: false,
  })

  expect(emergencyAccessStatusUpdate(database, access, 1, "2026-08-28T03:00:00.000Z")).toEqual({
    success: true,
    data: true,
  })
  expect(emergencyAccessStatusUpdate(database, { ...access, status: 0 }, 2, "2026-08-28T04:00:00.000Z")).toEqual({
    success: true,
    data: false,
  })
})
