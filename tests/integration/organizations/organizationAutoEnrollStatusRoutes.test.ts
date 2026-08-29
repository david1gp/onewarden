import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const organizationUuid = "00000000-0000-4000-8000-000000000411"
const policyUuid = "00000000-0000-4000-8000-000000000412"
const membershipUuid = "00000000-0000-4000-8000-000000000413"
const userUuid = "00000000-0000-4000-8000-000000000414"
const deviceUuid = "00000000-0000-4000-8000-000000000415"
const fakeSsoOrganizationUuid = "00000000-01DC-01DC-01DC-000000000000"
const databases: DatabaseConnection[] = []

function userCreate(): IdentityUser {
  return {
    uuid: userUuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "auto-enroll@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Auto-enroll User",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "auto-enroll-stamp",
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

function deviceCreate(): IdentityDevice {
  return {
    uuid: deviceUuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: "Auto-enroll Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "refresh-token",
    twoFactorRemember: null,
  }
}

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  device: IdentityDevice
  token: string
  user: IdentityUser
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = userCreate()
  const userResult = identityUserSave(database, user)
  if (!userResult.success) throw new Error(userResult.errorMessage)
  const device = deviceCreate()
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const deviceResult = identityDeviceSave(database, device, clock, false)
  if (!deviceResult.success) throw new Error(deviceResult.errorMessage)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Auto-enroll Organization",
    "billing@example.com",
  ])
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      membershipUuid,
      userUuid,
      organizationUuid,
      0,
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.user,
    ],
  )
  const config = identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 })
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "auto-enroll-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config,
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
    },
  })
  return { app, database, device, token: tokenResult.data.accessToken, user }
}

function policySet(database: DatabaseConnection, data: string, enabled = 1): void {
  database.run(
    `INSERT INTO org_policies (uuid, org_uuid, atype, enabled, data, revision_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [policyUuid, organizationUuid, 8, enabled, data, "2026-08-28T00:00:00.000Z"],
  )
}

async function statusRequest(
  context: Awaited<ReturnType<typeof contextCreate>>,
  identifier: string,
): Promise<Response> {
  return context.app.request(`https://vault.example/api/organizations/${identifier}/auto-enroll-status`, {
    headers: { authorization: `Bearer ${context.token}` },
  })
}

async function expectUnauthorized(response: Response, message: string): Promise<void> {
  expect(response.status).toBe(401)
  expect(response.headers.get("content-type")).toBe("application/json; charset=UTF-8")
  expect(await response.json()).toEqual({
    message,
    validationErrors: { "": [message] },
    errorModel: { message, object: "error" },
    error: "",
    error_description: "",
    exceptionMessage: null,
    exceptionStackTrace: null,
    innerExceptionMessage: null,
    object: "error",
  })
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("auto-enroll status returns exact real, fake, and unknown identifier bodies", async () => {
  const context = await contextCreate()
  policySet(context.database, JSON.stringify({ autoEnrollEnabled: true }))

  const realResponse = await statusRequest(context, organizationUuid)
  expect(realResponse.status).toBe(200)
  expect(realResponse.headers.get("content-type")).toBe("application/json")
  expect(await realResponse.json()).toEqual({
    id: organizationUuid,
    identifier: organizationUuid,
    resetPasswordEnabled: true,
  })

  const fakeResponse = await statusRequest(context, fakeSsoOrganizationUuid)
  expect(fakeResponse.status).toBe(200)
  expect(await fakeResponse.json()).toEqual({
    id: organizationUuid,
    identifier: organizationUuid,
    resetPasswordEnabled: true,
  })

  const unknownResponse = await statusRequest(context, "unknown-organization")
  expect(unknownResponse.status).toBe(200)
  expect(await unknownResponse.json()).toEqual({
    id: "unknown-organization",
    identifier: "unknown-organization",
    resetPasswordEnabled: false,
  })
})

test("auto-enroll status evaluates reset-password policy variants and malformed data as upstream does", async () => {
  const context = await contextCreate()
  const cases = [
    [JSON.stringify({ autoEnrollEnabled: true }), 1, true],
    [JSON.stringify({ AutoEnrollEnabled: true }), 1, true],
    [JSON.stringify({ autoEnrollEnabled: false }), 1, false],
    [JSON.stringify({ AutoEnrollEnabled: false }), 1, false],
    [JSON.stringify({ autoEnrollEnabled: true, unknown: "ignored" }), 1, true],
    [JSON.stringify({ autoEnrollEnabled: true, AutoEnrollEnabled: true }), 1, false],
    [JSON.stringify({}), 1, false],
    [JSON.stringify({ autoEnrollEnabled: "true" }), 1, false],
    ["{autoEnrollEnabled:true}", 1, false],
    [JSON.stringify({ autoEnrollEnabled: true }), 0, false],
  ] as const

  for (const [data, enabled, expected] of cases) {
    context.database.run("DELETE FROM org_policies WHERE uuid = ?", [policyUuid])
    policySet(context.database, data, enabled)
    const response = await statusRequest(context, organizationUuid)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: organizationUuid,
      identifier: organizationUuid,
      resetPasswordEnabled: expected,
    })
  }

  context.database.run("DELETE FROM org_policies WHERE uuid = ?", [policyUuid])
  const missingPolicyResponse = await statusRequest(context, organizationUuid)
  expect(missingPolicyResponse.status).toBe(200)
  expect(await missingPolicyResponse.json()).toEqual({
    id: organizationUuid,
    identifier: organizationUuid,
    resetPasswordEnabled: false,
  })
})

test("auto-enroll status preserves exact authentication errors", async () => {
  const missingTokenContext = await contextCreate()
  await expectUnauthorized(
    await missingTokenContext.app.request("https://vault.example/api/organizations/unknown/auto-enroll-status"),
    "No access token provided",
  )
  await expectUnauthorized(
    await missingTokenContext.app.request("https://vault.example/api/organizations/unknown/auto-enroll-status", {
      headers: { authorization: "Bearer malformed" },
    }),
    "Invalid claim",
  )

  const revokedContext = await contextCreate()
  revokedContext.database.run("DELETE FROM devices WHERE uuid = ?", [deviceUuid])
  await expectUnauthorized(await statusRequest(revokedContext, "unknown"), "Invalid device id")

  const staleContext = await contextCreate()
  const staleTokenResult = await identityTokenBundleCreate(
    staleContext.user,
    staleContext.device,
    "auto-enroll-client",
    "https://vault.example",
    keyPair.privateKey,
    clockTestCreate("2026-08-28T00:00:00.000Z"),
    identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 }),
  )
  if (!staleTokenResult.success) throw new Error(staleTokenResult.errorMessage)
  staleContext.database.run("UPDATE users SET security_stamp = ? WHERE uuid = ?", ["new-stamp", userUuid])
  const staleResponse = await staleContext.app.request(
    "https://vault.example/api/organizations/unknown/auto-enroll-status",
    { headers: { authorization: `Bearer ${staleTokenResult.data.accessToken}` } },
  )
  await expectUnauthorized(staleResponse, "Invalid security stamp")
})
