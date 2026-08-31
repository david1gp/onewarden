import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import type { IdentityMailAdapter } from "../../../src/server/contexts/identity/identityMailAdapter.js"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import type { IdentityMailMessage } from "../../../src/server/contexts/identity/identityMailMessage.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserFindByUuid } from "../../../src/server/contexts/identity/identityUserFindByUuid.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { NotificationAdapter } from "../../../src/server/contexts/notifications/notificationAdapter.js"
import { organizationCreate } from "../../../src/server/contexts/organizations/organizationCreate.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import { twoFactorProviderType } from "../../../src/server/contexts/twoFactor/twoFactorProviderType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const ownerUuid = "00000000-0000-4000-8000-000000000401"
const targetUuid = "00000000-0000-4000-8000-000000000402"
const ownerDeviceUuid = "00000000-0000-4000-8000-000000000403"
const targetDeviceUuid = "00000000-0000-4000-8000-000000000404"
const organizationUuid = "00000000-0000-4000-8000-000000000405"
const ownerMembershipUuid = "00000000-0000-4000-8000-000000000406"
const targetMembershipUuid = "00000000-0000-4000-8000-000000000407"
const collectionUuid = "00000000-0000-4000-8000-000000000408"
const policyUuid = "00000000-0000-4000-8000-000000000409"
const resetStampUuid = "00000000-0000-4000-8000-000000000410"
const eventUuid = "00000000-0000-4000-8000-000000000411"
const otherOrganizationUuid = "00000000-0000-4000-8000-000000000412"
const missingUserMembershipUuid = "00000000-0000-4000-8000-000000000413"
const missingUserUuid = "00000000-0000-4000-8000-000000000414"
const date = "2026-08-28T00:00:00.000Z"
const databases: DatabaseConnection[] = []

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data

type ContextOptions = {
  actorType?: number
  mail?: IdentityMailAdapter & { messages: IdentityMailMessage[] }
  mailEnabled?: boolean
  policyEnabled?: boolean | null
  policyData?: string
  targetResetPasswordKey?: string | null
  targetStatus?: number
  targetType?: number
}

function userCreate(uuid: string, email: string, name: string): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: date,
    updatedAt: date,
    verifiedAt: date,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email,
    emailNew: null,
    emailNewToken: null,
    name,
    passwordHash: Uint8Array.of(1),
    salt: Uint8Array.of(2),
    passwordIterations: 1,
    passwordHint: null,
    akey: "old-akey",
    privateKey: null,
    publicKey: null,
    securityStamp: `${uuid}-stamp`,
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 1,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function deviceCreate(uuid: string, userUuid: string, refreshToken: string): IdentityDevice {
  return {
    uuid,
    createdAt: date,
    updatedAt: date,
    userUuid,
    name: "Recovery device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken,
    twoFactorRemember: null,
  }
}

async function contextCreate(overrides: ContextOptions = {}): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  mail: IdentityMailAdapter & { messages: IdentityMailMessage[] }
  notificationUpdates: Array<{ userIds: string[]; update: Record<string, unknown> }>
  target: IdentityUser
  targetDevice: IdentityDevice
  token: string
  ownerPassword: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const clock = clockTestCreate(date)
  const config = identityConfigCreate({
    MAIL_ENABLED: overrides.mailEnabled ?? true,
    ORG_EVENTS_ENABLED: true,
    PASSWORD_ITERATIONS: 1,
  })
  const owner = userCreate(ownerUuid, "owner@example.com", "Owner")
  const target = userCreate(targetUuid, "target@example.com", "Target")
  const ownerPassword = "owner-password"
  const ownerPasswordHashResult = await passwordHashCreate(ownerPassword, owner.salt, owner.passwordIterations)
  if (!ownerPasswordHashResult.success) throw new Error(ownerPasswordHashResult.errorMessage)
  owner.passwordHash = ownerPasswordHashResult.data
  for (const user of [owner, target]) {
    const saveResult = identityUserSave(database, user)
    if (!saveResult.success) throw new Error(saveResult.errorMessage)
  }
  const ownerDevice = deviceCreate(ownerDeviceUuid, ownerUuid, "owner-refresh-token")
  const targetDevice = deviceCreate(targetDeviceUuid, targetUuid, "target-refresh-token")
  targetDevice.twoFactorRemember = "remembered-two-factor"
  for (const device of [ownerDevice, targetDevice]) {
    const saveResult = identityDeviceSave(database, device, clock, false)
    if (!saveResult.success) throw new Error(saveResult.errorMessage)
  }
  const organizationResult = organizationCreate(
    database,
    ownerUuid,
    {
      billingEmail: owner.email,
      collectionName: "Initial collection",
      key: "owner-key",
      name: "Recovery Organization",
      planType: 6,
    },
    clock,
    identifierTestCreate([organizationUuid, ownerMembershipUuid, collectionUuid]),
  )
  if (!organizationResult.success) throw new Error(organizationResult.errorMessage)
  if (overrides.actorType !== undefined)
    database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [overrides.actorType, ownerMembershipUuid])
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype, reset_password_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      targetMembershipUuid,
      targetUuid,
      organizationUuid,
      "target-org-key",
      overrides.targetStatus ?? organizationMembershipStatus.confirmed,
      overrides.targetType ?? organizationMembershipType.user,
      overrides.targetResetPasswordKey === undefined ? "enrollment-key" : overrides.targetResetPasswordKey,
    ],
  )
  if (overrides.policyEnabled !== null)
    database.run("INSERT INTO org_policies (uuid, org_uuid, atype, enabled, data) VALUES (?, ?, ?, ?, ?)", [
      policyUuid,
      organizationUuid,
      8,
      overrides.policyEnabled ?? true,
      overrides.policyData ?? "{}",
    ])

  const mail = overrides.mail ?? identityMailAdapterCreate(clock)
  const notificationUpdates: Array<{ userIds: string[]; update: Record<string, unknown> }> = []
  const notification: NotificationAdapter = {
    sendCipherUpdate: () => undefined,
    sendFolderUpdate: () => undefined,
    sendUpdate: (userIds, update) => notificationUpdates.push({ userIds: [...userIds], update }),
    sendUserUpdate: () => undefined,
  }
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config,
      database,
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
    identifier: identifierTestCreate([resetStampUuid, eventUuid]),
    notifications: { enabled: false },
    organizations: { notification },
  })
  const tokenResult = await identityTokenBundleCreate(
    owner,
    ownerDevice,
    "recovery-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  return {
    app,
    database,
    mail,
    notificationUpdates,
    ownerPassword,
    target,
    targetDevice,
    token: tokenResult.data.accessToken,
  }
}

function requestHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-forwarded-for": "192.0.2.10",
    "x-request-id": "recovery-test",
  }
}

function recoveryBody(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ key: "new-akey", newMasterPasswordHash: "new-password-hash", ...overrides })
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("managed account recovery mutates credentials only after mail and logs out with event 1508", async () => {
  const context = await contextCreate()
  const response = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/${targetMembershipUuid}/recover-account`,
    {
      body: recoveryBody({ resetMasterPassword: true }),
      headers: requestHeaders(context.token),
      method: "PUT",
    },
  )

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("")
  const resetMessage = context.mail.messages.find((message) => message.kind === "adminResetPassword")
  expect({
    kind: resetMessage?.kind,
    organizationName: resetMessage?.organizationName,
    recipient: resetMessage?.recipient,
    targetEmail: resetMessage?.targetEmail,
    timestamp: resetMessage?.timestamp,
    token: resetMessage?.token,
    userId: resetMessage?.userId,
    userName: resetMessage?.userName,
  }).toEqual({
    kind: "adminResetPassword",
    organizationName: "Recovery Organization",
    recipient: "target@example.com",
    targetEmail: null,
    timestamp: date,
    token: null,
    userId: null,
    userName: "Target",
  })
  const targetResult = identityUserFindByUuid(context.database, targetUuid)
  if (!targetResult.success || targetResult.data === null) throw new Error("target user not found")
  expect(targetResult.data.akey).toBe("new-akey")
  expect(targetResult.data.passwordHash).not.toEqual(context.target.passwordHash)
  expect(targetResult.data.securityStamp).toBe(resetStampUuid)
  expect(targetResult.data.updatedAt).toBe(date)
  expect(context.database.query("SELECT refresh_token FROM devices WHERE uuid = ?").get(targetDeviceUuid)).not.toEqual({
    refresh_token: "target-refresh-token",
  })
  expect(context.database.query("SELECT twofactor_remember FROM devices WHERE uuid = ?").get(targetDeviceUuid)).toEqual(
    {
      twofactor_remember: "remembered-two-factor",
    },
  )
  expect(context.notificationUpdates).toEqual([
    {
      update: { contextId: null, payload: { Date: new Date(date), UserId: targetUuid }, type: 11 },
      userIds: [targetUuid],
    },
  ])
  expect(
    context.database
      .query("SELECT event_type, org_uuid, org_user_uuid, act_user_uuid, device_type, ip_address FROM event")
      .get(),
  ).toEqual({
    act_user_uuid: ownerUuid,
    device_type: 7,
    event_type: 1508,
    ip_address: "192.0.2.10",
    org_uuid: organizationUuid,
    org_user_uuid: targetMembershipUuid,
  })
})

test("recover-account validates flags and reset-password keeps the deprecated alias", async () => {
  const context = await contextCreate()
  const unsupportedResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/${targetMembershipUuid}/recover-account`,
    { body: recoveryBody(), headers: requestHeaders(context.token), method: "PUT" },
  )
  expect(unsupportedResponse.status).toBe(400)
  expect((await unsupportedResponse.json()).message).toBe("Unsupported operation")
  expect(context.mail.messages).toHaveLength(0)

  const aliasResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/${targetMembershipUuid}/reset-password`,
    { body: recoveryBody(), headers: requestHeaders(context.token), method: "PUT" },
  )
  expect(aliasResponse.status).toBe(200)
  expect(await aliasResponse.text()).toBe("")
  expect(context.mail.messages).toHaveLength(1)

  const secondContext = await contextCreate()
  const twoFactorResponse = await secondContext.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/${targetMembershipUuid}/recover-account`,
    {
      body: recoveryBody({ resetMasterPassword: true, resetTwoFactor: true }),
      headers: requestHeaders(secondContext.token),
      method: "PUT",
    },
  )
  expect(twoFactorResponse.status).toBe(400)
  expect((await twoFactorResponse.json()).message).toBe("Unsupported operation")
})

test("recovery checks mail, policy, enrollment, and confirmation before mutation", async () => {
  const mailDisabled = await contextCreate({ mailEnabled: false })
  const mailDisabledResponse = await recover(mailDisabled)
  expect((await mailDisabledResponse.json()).message).toBe(
    "Password reset is not supported on an email-disabled instance.",
  )

  const missingPolicy = await contextCreate({ policyEnabled: null })
  expect((await (await recover(missingPolicy)).json()).message).toBe("Policy not found")

  const disabledPolicy = await contextCreate({ policyEnabled: false })
  expect((await (await recover(disabledPolicy)).json()).message).toBe("Reset password policy not enabled")

  const unenrolled = await contextCreate({ targetResetPasswordKey: null })
  expect((await (await recover(unenrolled)).json()).message).toBe("Password reset not or not correctly enrolled")

  const unconfirmed = await contextCreate({ targetStatus: organizationMembershipStatus.accepted })
  expect((await (await recover(unconfirmed)).json()).message).toBe(
    "Organization user must be confirmed for password reset functionality",
  )
})

test("managed account recovery enforces the upstream actor and target role matrix", async () => {
  const allowedRolePairs = [
    organizationMembershipType.owner,
    organizationMembershipType.admin,
    organizationMembershipType.manager,
    organizationMembershipType.user,
  ].flatMap((targetType) => [
    { actorType: organizationMembershipType.owner, targetType },
    ...(targetType === organizationMembershipType.owner
      ? []
      : [{ actorType: organizationMembershipType.admin, targetType }]),
  ])

  for (const rolePair of allowedRolePairs) {
    const context = await contextCreate(rolePair)
    const response = await recover(context)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("")
    expect(context.mail.messages).toHaveLength(1)
  }

  const adminCannotResetOwner = await contextCreate({
    actorType: organizationMembershipType.admin,
    targetType: organizationMembershipType.owner,
  })
  const adminOwnerResponse = await recover(adminCannotResetOwner)
  expect(adminOwnerResponse.status).toBe(400)
  expect((await adminOwnerResponse.json()).message).toBe("No permission to reset this user's password")

  for (const actorType of [organizationMembershipType.manager, organizationMembershipType.user]) {
    const context = await contextCreate({ actorType })
    const response = await recover(context)
    expect(response.status).toBe(401)
    expect((await response.json()).message).toBe("You need to be Admin or Owner to call this endpoint")
    expect(context.mail.messages).toHaveLength(0)
  }
})

test("managed account recovery rejects a cross-organization path before mutation", async () => {
  const context = await contextCreate()
  const response = await context.app.request(
    `https://vault.example/api/organizations/${otherOrganizationUuid}/users/${targetMembershipUuid}/recover-account`,
    {
      body: recoveryBody({ resetMasterPassword: true }),
      headers: requestHeaders(context.token),
      method: "PUT",
    },
  )

  expect(response.status).toBe(401)
  expect((await response.json()).message).toBe("The current user isn't member of the organization")
  expect(context.mail.messages).toHaveLength(0)
})

test("mail failure leaves the managed account unchanged", async () => {
  const mail = identityMailAdapterCreate(clockTestCreate(date))
  mail.sendAdminResetPassword = async () => ({ success: false, op: "testMail", errorMessage: "mail failed" })
  const context = await contextCreate({ mail })
  const before = identityUserFindByUuid(context.database, targetUuid)
  if (!before.success || before.data === null) throw new Error("target user not found")

  const response = await recover(context)
  expect(response.status).toBe(400)
  expect((await response.json()).message).toBe("Error sending user reset password email: mail failed")
  const after = identityUserFindByUuid(context.database, targetUuid)
  if (!after.success || after.data === null) throw new Error("target user not found")
  expect(after.data).toMatchObject({
    akey: before.data.akey,
    securityStamp: before.data.securityStamp,
    updatedAt: date,
  })
  expect(context.database.query("SELECT COUNT(*) AS count FROM event").get()).toEqual({ count: 0 })
})

test("reset-password-details returns the exact upstream object and values", async () => {
  const context = await contextCreate({
    targetResetPasswordKey: null,
    targetStatus: organizationMembershipStatus.accepted,
  })
  context.database.run("UPDATE organizations SET private_key = ? WHERE uuid = ?", [
    "organization-private-key",
    organizationUuid,
  ])
  context.database.run(
    `UPDATE users
     SET client_kdf_type = ?, client_kdf_iter = ?, client_kdf_memory = ?, client_kdf_parallelism = ?
     WHERE uuid = ?`,
    [1, 600_000, 64, 4, targetUuid],
  )

  const response = await resetPasswordDetails(context)

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    encryptedPrivateKey: "organization-private-key",
    kdf: 1,
    kdfIterations: 600_000,
    kdfMemory: 64,
    kdfParallelism: 4,
    object: "organizationUserResetPasswordDetails",
    organizationUserId: targetMembershipUuid,
    resetPasswordKey: null,
  })
})

test("reset-password-details shares mail, policy, member, and user checks without requiring enrollment", async () => {
  const mailDisabled = await contextCreate({ mailEnabled: false })
  const mailDisabledResponse = await resetPasswordDetails(mailDisabled)
  expect(mailDisabledResponse.status).toBe(400)
  expect((await mailDisabledResponse.json()).message).toBe(
    "Password reset is not supported on an email-disabled instance.",
  )

  const missingPolicy = await contextCreate({ policyEnabled: null })
  expect((await (await resetPasswordDetails(missingPolicy)).json()).message).toBe("Policy not found")

  const disabledPolicy = await contextCreate({ policyEnabled: false })
  expect((await (await resetPasswordDetails(disabledPolicy)).json()).message).toBe("Reset password policy not enabled")

  const unconfirmedUnenrolled = await contextCreate({
    targetResetPasswordKey: null,
    targetStatus: organizationMembershipStatus.accepted,
  })
  expect((await resetPasswordDetails(unconfirmedUnenrolled)).status).toBe(200)

  const missingMember = await contextCreate()
  const missingMemberResponse = await resetPasswordDetails(missingMember, "00000000-0000-4000-8000-000000000415")
  expect(missingMemberResponse.status).toBe(400)
  expect((await missingMemberResponse.json()).message).toBe("User to reset isn't member of required organization")

  const missingUser = await contextCreate()
  missingUser.database.run("PRAGMA foreign_keys = OFF")
  missingUser.database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype, reset_password_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      missingUserMembershipUuid,
      missingUserUuid,
      organizationUuid,
      "missing-user-org-key",
      organizationMembershipStatus.accepted,
      organizationMembershipType.user,
      null,
    ],
  )
  missingUser.database.run("PRAGMA foreign_keys = ON")
  const missingUserResponse = await resetPasswordDetails(missingUser, missingUserMembershipUuid)
  expect(missingUserResponse.status).toBe(400)
  expect((await missingUserResponse.json()).message).toBe("User not found")
})

test("reset-password-details enforces the upstream admin and target role matrix", async () => {
  const adminCannotResetOwner = await contextCreate({
    actorType: organizationMembershipType.admin,
    targetType: organizationMembershipType.owner,
  })
  const adminOwnerResponse = await resetPasswordDetails(adminCannotResetOwner)
  expect(adminOwnerResponse.status).toBe(400)
  expect((await adminOwnerResponse.json()).message).toBe("No permission to reset this user's password")

  for (const actorType of [organizationMembershipType.manager, organizationMembershipType.user]) {
    const context = await contextCreate({ actorType })
    const response = await resetPasswordDetails(context)
    expect(response.status).toBe(401)
    expect((await response.json()).message).toBe("You need to be Admin or Owner to call this endpoint")
  }
})

test("reset-password-enrollment withdraws missing, null, and empty keys with empty 200 responses", async () => {
  for (const body of [{}, { resetPasswordKey: null }, { resetPasswordKey: "" }]) {
    const context = await contextCreate()
    context.database.run("UPDATE users_organizations SET reset_password_key = ? WHERE uuid = ?", [
      "existing-reset-key",
      ownerMembershipUuid,
    ])
    const response = await enroll(context, body)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("")
    expect(
      context.database
        .query("SELECT reset_password_key FROM users_organizations WHERE uuid = ?")
        .get(ownerMembershipUuid),
    ).toEqual({ reset_password_key: null })
    expect(context.database.query("SELECT event_type FROM event").get()).toEqual({ event_type: 1507 })
  }
})

test("reset-password-enrollment validates camel and Pascal password fields before enrollment", async () => {
  const camelContext = await contextCreate()
  const camelResponse = await enroll(camelContext, {
    masterPasswordHash: camelContext.ownerPassword,
    resetPasswordKey: "camel-reset-key",
  })
  expect(camelResponse.status).toBe(200)
  expect(await camelResponse.text()).toBe("")
  expect(
    camelContext.database
      .query("SELECT reset_password_key FROM users_organizations WHERE uuid = ?")
      .get(ownerMembershipUuid),
  ).toEqual({ reset_password_key: "camel-reset-key" })
  expect(camelContext.database.query("SELECT event_type FROM event").get()).toEqual({ event_type: 1506 })

  const pascalContext = await contextCreate()
  const pascalResponse = await enroll(pascalContext, {
    MasterPasswordHash: pascalContext.ownerPassword,
    resetPasswordKey: "pascal-reset-key",
  })
  expect(pascalResponse.status).toBe(200)
  expect(await pascalResponse.text()).toBe("")
  expect(
    pascalContext.database
      .query("SELECT reset_password_key FROM users_organizations WHERE uuid = ?")
      .get(ownerMembershipUuid),
  ).toEqual({ reset_password_key: "pascal-reset-key" })
  expect(pascalContext.database.query("SELECT event_type FROM event").get()).toEqual({ event_type: 1506 })
})

test("reset-password-enrollment accepts a protected-action OTP and consumes it", async () => {
  const context = await contextCreate()
  context.database.run("INSERT INTO twofactor (uuid, user_uuid, atype, data) VALUES (?, ?, ?, ?)", [
    resetStampUuid,
    ownerUuid,
    twoFactorProviderType.protectedActions,
    JSON.stringify({ attempts: 0, token: "654321", token_sent: 1_787_875_200 }),
  ])

  const response = await enroll(context, { otp: "654321", resetPasswordKey: "otp-reset-key" })

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("")
  expect(
    context.database
      .query("SELECT reset_password_key FROM users_organizations WHERE uuid = ?")
      .get(ownerMembershipUuid),
  ).toEqual({ reset_password_key: "otp-reset-key" })
  expect(context.database.query("SELECT COUNT(*) AS count FROM twofactor WHERE uuid = ?").get(resetStampUuid)).toEqual({
    count: 0,
  })
  expect(context.database.query("SELECT event_type FROM event").get()).toEqual({ event_type: 1506 })
})

test("reset-password-enrollment rejects invalid enrollment credentials without mutation", async () => {
  const context = await contextCreate()
  const missingValidationResponse = await enroll(context, { resetPasswordKey: "missing-validation" })
  expect(missingValidationResponse.status).toBe(400)
  expect((await missingValidationResponse.json()).message).toBe("No validation provided")

  const invalidPasswordResponse = await enroll(context, {
    masterPasswordHash: "wrong-password",
    resetPasswordKey: "invalid-password",
  })
  expect(invalidPasswordResponse.status).toBe(400)
  expect((await invalidPasswordResponse.json()).message).toBe("Invalid password")
  expect(
    context.database
      .query("SELECT reset_password_key FROM users_organizations WHERE uuid = ?")
      .get(ownerMembershipUuid),
  ).toEqual({ reset_password_key: null })
  expect(context.database.query("SELECT COUNT(*) AS count FROM event").get()).toEqual({ count: 0 })
})

test("reset-password-enrollment enforces policy checks and enterprise withdrawal prohibition", async () => {
  const mailDisabled = await contextCreate({ mailEnabled: false })
  const mailDisabledResponse = await enroll(mailDisabled, {})
  expect(mailDisabledResponse.status).toBe(400)
  expect((await mailDisabledResponse.json()).message).toBe(
    "Password reset is not supported on an email-disabled instance.",
  )

  const missingPolicy = await contextCreate({ policyEnabled: null })
  const missingPolicyResponse = await enroll(missingPolicy, {})
  expect(missingPolicyResponse.status).toBe(400)
  expect((await missingPolicyResponse.json()).message).toBe("Policy not found")

  const disabledPolicy = await contextCreate({ policyEnabled: false })
  const disabledPolicyResponse = await enroll(disabledPolicy, {})
  expect(disabledPolicyResponse.status).toBe(400)
  expect((await disabledPolicyResponse.json()).message).toBe("Reset password policy not enabled")

  const autoEnroll = await contextCreate({ policyData: JSON.stringify({ AutoEnrollEnabled: true }) })
  const autoEnrollResponse = await enroll(autoEnroll, {})
  expect(autoEnrollResponse.status).toBe(400)
  expect((await autoEnrollResponse.json()).message).toBe(
    "Reset password can't be withdrawn due to an enterprise policy",
  )
})

test("reset-password-enrollment requires the acting user and organization to match", async () => {
  const context = await contextCreate()
  const otherUserResponse = await enroll(context, {}, targetUuid)
  expect(otherUserResponse.status).toBe(400)
  expect((await otherUserResponse.json()).message).toBe("User to enroll isn't member of required organization")

  const otherOrganizationResponse = await context.app.request(
    `https://vault.example/api/organizations/${otherOrganizationUuid}/users/${ownerUuid}/reset-password-enrollment`,
    { body: JSON.stringify({}), headers: requestHeaders(context.token), method: "PUT" },
  )
  expect(otherOrganizationResponse.status).toBe(401)
  expect((await otherOrganizationResponse.json()).message).toBe("The current user isn't member of the organization")
})

async function recover(context: Awaited<ReturnType<typeof contextCreate>>): Promise<Response> {
  return context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/${targetMembershipUuid}/recover-account`,
    {
      body: recoveryBody({ resetMasterPassword: true }),
      headers: requestHeaders(context.token),
      method: "PUT",
    },
  )
}

async function enroll(
  context: Awaited<ReturnType<typeof contextCreate>>,
  body: Record<string, unknown>,
  userId = ownerUuid,
): Promise<Response> {
  return context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/${userId}/reset-password-enrollment`,
    { body: JSON.stringify(body), headers: requestHeaders(context.token), method: "PUT" },
  )
}

async function resetPasswordDetails(
  context: Awaited<ReturnType<typeof contextCreate>>,
  memberId = targetMembershipUuid,
): Promise<Response> {
  return context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/${memberId}/reset-password-details`,
    { headers: requestHeaders(context.token), method: "GET" },
  )
}
