import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import { identityUserFindByUuid } from "../../../src/server/contexts/identity/identityUserFindByUuid.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserProfileToJson } from "../../../src/server/contexts/identity/identityUserProfileToJson.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { organizationCreate } from "../../../src/server/contexts/organizations/organizationCreate.js"
import { organizationMembershipAccept } from "../../../src/server/contexts/organizations/organizationMembershipAccept.js"
import { organizationMembershipConfirm } from "../../../src/server/contexts/organizations/organizationMembershipConfirm.js"
import { organizationMembershipFindByUserAndOrganization } from "../../../src/server/contexts/organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipInvite } from "../../../src/server/contexts/organizations/organizationMembershipInvite.js"
import { organizationMembershipInviteTokenDecode } from "../../../src/server/contexts/organizations/organizationMembershipInviteTokenDecode.js"
import { organizationMembershipResend } from "../../../src/server/contexts/organizations/organizationMembershipResend.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const ownerUuid = "00000000-0000-4000-8000-000000000201"
const targetUuid = "00000000-0000-4000-8000-000000000202"
const organizationUuid = "00000000-0000-4000-8000-000000000203"
const membershipUuid = "00000000-0000-4000-8000-000000000204"
const collectionUuid = "00000000-0000-4000-8000-000000000205"
const targetMembershipUuid = "00000000-0000-4000-8000-000000000206"
const databases: DatabaseConnection[] = []

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data

function userCreate(uuid: string, email: string): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email,
    emailNew: null,
    emailNewToken: null,
    name: email,
    passwordHash: Uint8Array.of(1),
    salt: Uint8Array.from({ length: 64 }, (_, index) => index + 1),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "user-akey",
    privateKey: null,
    publicKey: null,
    securityStamp: `${uuid}-stamp`,
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
}

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function organizationSetup(database: DatabaseConnection): void {
  const saveResult = identityUserSave(database, userCreate(ownerUuid, "owner@example.com"))
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const createResult = organizationCreate(
    database,
    ownerUuid,
    {
      billingEmail: "owner@example.com",
      collectionName: "Initial collection",
      key: "owner-key",
      name: "Organization",
      planType: 6,
    },
    clockTestCreate("2026-08-28T00:00:00.000Z"),
    identifierTestCreate([organizationUuid, membershipUuid, collectionUuid]),
  )
  if (!createResult.success) throw new Error(createResult.errorMessage)
}

function inviteOptions(
  database: DatabaseConnection,
  clock: ReturnType<typeof clockTestCreate>,
  mail: ReturnType<typeof identityMailAdapterCreate>,
  configOverrides: Parameters<typeof identityConfigCreate>[0] = {},
) {
  const actorMembershipResult = organizationMembershipFindByUserAndOrganization(database, ownerUuid, organizationUuid)
  if (!actorMembershipResult.success || actorMembershipResult.data === null)
    throw new Error("Organization owner membership was not found")
  return {
    actorMembership: actorMembershipResult.data,
    clock,
    config: identityConfigCreate({ MAIL_ENABLED: true, PASSWORD_ITERATIONS: 100_000, ...configOverrides }),
    identifier: identifierTestCreate([targetUuid, "00000000-0000-4000-8000-000000000206"]),
    issuer: "https://vault.example",
    mail,
    privateKey: keyPair.privateKey,
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("invite, accept, and confirm preserve claims, reset keys, roles, assignments, mail order, and revisions", async () => {
  const database = databaseCreate()
  organizationSetup(database)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const mail = identityMailAdapterCreate(clock)
  const options = inviteOptions(database, clock, mail)
  const inviteResult = await organizationMembershipInvite(
    database,
    organizationUuid,
    "OWNER@EXAMPLE.COM",
    {
      collections: [{ hidePasswords: true, id: collectionUuid, manage: true, readOnly: false }],
      emails: ["target@example.com"],
      groups: [],
      permissions: {},
      type: "Custom",
    },
    options,
  )
  expect(inviteResult.success).toBe(true)
  if (!inviteResult.success) return
  expect(inviteResult.data[0]?.membership).toMatchObject({
    accessAll: false,
    status: organizationMembershipStatus.invited,
    type: organizationMembershipType.manager,
  })
  expect(mail.messages[0]).toMatchObject({ kind: "invite", recipient: "target@example.com" })
  const token = mail.messages[0]?.token
  expect(token).not.toBeNull()
  if (token === null || token === undefined) return
  const claimsResult = await organizationMembershipInviteTokenDecode(
    token,
    "https://vault.example",
    keyPair.publicKey,
    clock,
  )
  expect(claimsResult).toMatchObject({
    success: true,
    data: {
      email: "target@example.com",
      memberId: inviteResult.data[0]?.membership.uuid,
      organizationId: organizationUuid,
      subject: targetUuid,
    },
  })
  expect(
    database
      .query("SELECT read_only, hide_passwords, manage FROM users_collections WHERE user_uuid = ?")
      .get(targetUuid),
  ).toEqual({
    read_only: 0,
    hide_passwords: 1,
    manage: 1,
  })

  const targetResult = identityUserFindByUuid(database, targetUuid)
  expect(targetResult.success).toBe(true)
  if (!targetResult.success || targetResult.data === null) return
  const acceptResult = await organizationMembershipAccept(
    database,
    targetResult.data,
    organizationUuid,
    inviteResult.data[0]?.membership.uuid ?? "",
    { resetPasswordKey: "reset-key", token },
    {
      clock,
      config: options.config,
      issuer: "https://vault.example",
      mail,
      publicKey: keyPair.publicKey,
    },
  )
  expect(acceptResult).toEqual({ success: true, data: { userUuid: targetUuid } })
  expect(mail.messages[1]).toMatchObject({ kind: "inviteAccepted", recipient: "owner@example.com" })
  expect(
    database
      .query("SELECT status, reset_password_key FROM users_organizations WHERE user_uuid = ? AND org_uuid = ?")
      .get(targetUuid, organizationUuid),
  ).toEqual({ status: organizationMembershipStatus.accepted, reset_password_key: "reset-key" })

  const ownerMembershipResult = organizationMembershipFindByUserAndOrganization(database, ownerUuid, organizationUuid)
  if (!ownerMembershipResult.success || ownerMembershipResult.data === null) return
  const confirmResult = await organizationMembershipConfirm(
    database,
    ownerMembershipResult.data,
    organizationUuid,
    inviteResult.data[0]?.membership.uuid ?? "",
    "target-organization-key",
    { clock, config: options.config, mail },
  )
  expect(confirmResult.success).toBe(true)
  if (!confirmResult.success) return
  expect(confirmResult.data.revisionDate).toBe("2026-08-28T00:00:00.000Z")
  expect(mail.messages[2]).toMatchObject({ kind: "inviteConfirmed", recipient: "target@example.com" })
  expect(database.query("SELECT status, atype FROM users_organizations WHERE user_uuid = ?").get(targetUuid)).toEqual({
    status: organizationMembershipStatus.confirmed,
    atype: organizationMembershipType.manager,
  })
  expect(database.query("SELECT updated_at FROM users WHERE uuid = ?").get(targetUuid)).toEqual({
    updated_at: confirmResult.data.revisionDate,
  })
  expect(identityUserProfileToJson(targetResult.data, options.config, database).organizations).toMatchObject([
    { type: 4, status: organizationMembershipStatus.confirmed },
  ])
})

test("invite mail failure rolls back only the target organization assignments", async () => {
  const database = databaseCreate()
  organizationSetup(database)
  const otherOrganizationUuid = "00000000-0000-4000-8000-000000000207"
  const otherCollectionUuid = "00000000-0000-4000-8000-000000000208"
  const targetSaveResult = identityUserSave(database, userCreate(targetUuid, "target@example.com"))
  if (!targetSaveResult.success) throw new Error(targetSaveResult.errorMessage)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    otherOrganizationUuid,
    "Other organization",
    "other@example.com",
  ])
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    otherCollectionUuid,
    otherOrganizationUuid,
    "Other collection",
  ])
  database.run("INSERT INTO users_collections (user_uuid, collection_uuid) VALUES (?, ?)", [
    targetUuid,
    otherCollectionUuid,
  ])
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const defaultMail = identityMailAdapterCreate(clock)
  const mail = {
    ...defaultMail,
    sendInvite: async () => resultErrorCreate("testMail", "mail failed"),
  }
  const result = await organizationMembershipInvite(
    database,
    organizationUuid,
    "owner@example.com",
    {
      collections: [{ hidePasswords: false, id: collectionUuid, manage: false, readOnly: true }],
      emails: ["target@example.com"],
      groups: [],
      type: 2,
    },
    inviteOptions(database, clock, mail),
  )
  expect(result.success).toBe(false)
  expect(
    database.query("SELECT COUNT(*) AS count FROM users_organizations WHERE org_uuid = ?").get(organizationUuid),
  ).toEqual({
    count: 1,
  })
  expect(
    database
      .query("SELECT COUNT(*) AS count FROM users_collections WHERE user_uuid = ? AND collection_uuid = ?")
      .get(targetUuid, collectionUuid),
  ).toEqual({
    count: 0,
  })
  expect(
    database
      .query("SELECT COUNT(*) AS count FROM users_collections WHERE user_uuid = ? AND collection_uuid = ?")
      .get(targetUuid, otherCollectionUuid),
  ).toEqual({
    count: 1,
  })
})

test("resend sends a fresh invitation token without changing the invited membership", async () => {
  const database = databaseCreate()
  organizationSetup(database)
  const targetSaveResult = identityUserSave(database, userCreate(targetUuid, "target@example.com"))
  if (!targetSaveResult.success) throw new Error(targetSaveResult.errorMessage)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const mail = identityMailAdapterCreate(clock)
  const options = inviteOptions(database, clock, mail)
  const inviteResult = await organizationMembershipInvite(
    database,
    organizationUuid,
    "owner@example.com",
    { emails: ["target@example.com"], groups: [], type: 2 },
    options,
  )
  if (!inviteResult.success) return
  const resendResult = await organizationMembershipResend(
    database,
    organizationUuid,
    inviteResult.data[0]?.membership.uuid ?? "",
    "owner@example.com",
    {
      clock,
      config: options.config,
      issuer: "https://vault.example",
      mail,
      privateKey: keyPair.privateKey,
    },
  )
  expect(resendResult).toEqual({ success: true, data: { statusChanged: false, userUuid: targetUuid } })
  expect(mail.messages.filter((message) => message.kind === "invite")).toHaveLength(2)
  expect(database.query("SELECT status FROM users_organizations WHERE user_uuid = ?").get(targetUuid)).toEqual({
    status: organizationMembershipStatus.invited,
  })
})

test("resend without mail keeps pending users invited and accepts existing users", async () => {
  const pendingDatabase = databaseCreate()
  organizationSetup(pendingDatabase)
  const pendingClock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const pendingMail = identityMailAdapterCreate(pendingClock)
  const pendingOptions = inviteOptions(pendingDatabase, pendingClock, pendingMail, { MAIL_ENABLED: false })
  const pendingInviteResult = await organizationMembershipInvite(
    pendingDatabase,
    organizationUuid,
    "owner@example.com",
    { emails: ["target@example.com"], groups: [], type: 2 },
    pendingOptions,
  )
  expect(pendingInviteResult.success).toBe(true)
  if (!pendingInviteResult.success) return
  const pendingMembershipUuid = pendingInviteResult.data[0]?.membership.uuid ?? ""
  const pendingResendResult = await organizationMembershipResend(
    pendingDatabase,
    organizationUuid,
    pendingMembershipUuid,
    "owner@example.com",
    {
      clock: pendingClock,
      config: pendingOptions.config,
      issuer: "https://vault.example",
      mail: pendingMail,
      privateKey: keyPair.privateKey,
    },
  )
  expect(pendingResendResult).toEqual({ success: true, data: { statusChanged: false, userUuid: targetUuid } })
  expect(
    pendingDatabase.query("SELECT status FROM users_organizations WHERE uuid = ?").get(pendingMembershipUuid),
  ).toEqual({
    status: organizationMembershipStatus.invited,
  })
  expect(
    pendingDatabase.query("SELECT COUNT(*) AS count FROM invitations WHERE email = ?").get("target@example.com"),
  ).toEqual({
    count: 1,
  })

  const existingDatabase = databaseCreate()
  organizationSetup(existingDatabase)
  const targetSaveResult = identityUserSave(existingDatabase, userCreate(targetUuid, "target@example.com"))
  if (!targetSaveResult.success) throw new Error(targetSaveResult.errorMessage)
  existingDatabase.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      targetMembershipUuid,
      targetUuid,
      organizationUuid,
      "",
      organizationMembershipStatus.invited,
      organizationMembershipType.user,
    ],
  )
  const existingClock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const existingMail = identityMailAdapterCreate(existingClock)
  const existingOptions = inviteOptions(existingDatabase, existingClock, existingMail, { MAIL_ENABLED: false })
  const existingResendResult = await organizationMembershipResend(
    existingDatabase,
    organizationUuid,
    targetMembershipUuid,
    "owner@example.com",
    {
      clock: existingClock,
      config: existingOptions.config,
      issuer: "https://vault.example",
      mail: existingMail,
      privateKey: keyPair.privateKey,
    },
  )
  expect(existingResendResult).toEqual({ success: true, data: { statusChanged: true, userUuid: targetUuid } })
  expect(
    existingDatabase.query("SELECT status FROM users_organizations WHERE uuid = ?").get(targetMembershipUuid),
  ).toEqual({
    status: organizationMembershipStatus.accepted,
  })
  expect(
    existingDatabase.query("SELECT COUNT(*) AS count FROM invitations WHERE email = ?").get("target@example.com"),
  ).toEqual({
    count: 0,
  })
})

test("accept rejects a missing reset-password key and a token for another subject", async () => {
  const database = databaseCreate()
  organizationSetup(database)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const mail = identityMailAdapterCreate(clock)
  const options = inviteOptions(database, clock, mail)
  const inviteResult = await organizationMembershipInvite(
    database,
    organizationUuid,
    "owner@example.com",
    { emails: ["target@example.com"], groups: [], type: 2 },
    options,
  )
  if (!inviteResult.success) return
  const token = mail.messages[0]?.token
  if (token === null || token === undefined) return
  const targetResult = identityUserFindByUuid(database, targetUuid)
  const ownerResult = identityUserFindByUuid(database, ownerUuid)
  if (!targetResult.success || targetResult.data === null || !ownerResult.success || ownerResult.data === null) return
  const membershipUuid = inviteResult.data[0]?.membership.uuid ?? ""
  const missingResetResult = await organizationMembershipAccept(
    database,
    targetResult.data,
    organizationUuid,
    membershipUuid,
    { token },
    {
      clock,
      config: options.config,
      issuer: "https://vault.example",
      mail,
      publicKey: keyPair.publicKey,
    },
  )
  expect(missingResetResult).toMatchObject({
    success: false,
    errorMessage: "Reset password key is required, but not provided.",
  })
  const wrongSubjectResult = await organizationMembershipAccept(
    database,
    ownerResult.data,
    organizationUuid,
    membershipUuid,
    { resetPasswordKey: "reset-key", token },
    {
      clock,
      config: options.config,
      issuer: "https://vault.example",
      mail,
      publicKey: keyPair.publicKey,
    },
  )
  expect(wrongSubjectResult).toMatchObject({
    success: false,
    errorMessage: "Invitation was issued to a different account",
  })
  expect(database.query("SELECT status FROM users_organizations WHERE uuid = ?").get(membershipUuid)).toEqual({
    status: organizationMembershipStatus.invited,
  })
})
