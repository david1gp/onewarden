import { afterEach, expect, test } from "bun:test"
import { identityAccessTokenClaimsCreate } from "../../../src/server/contexts/identity/identityAccessTokenClaimsCreate.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityOrganizationApiKeyAccessTokenClaimsCreate } from "../../../src/server/contexts/identity/identityOrganizationApiKeyAccessTokenClaimsCreate.js"
import { identityOrganizationApiKeySave } from "../../../src/server/contexts/identity/identityOrganizationApiKeySave.js"
import type { IdentityMailAdapter } from "../../../src/server/contexts/identity/identityMailAdapter.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { jwtSign } from "../../../src/shared/crypto/jwtSign.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const organizationUuid = "00000000-0000-4000-8000-000000000211"
const apiKeyUuid = "00000000-0000-4000-8000-000000000212"
const authenticatedUserUuid = "00000000-0000-4000-8000-000000000221"
const authenticatedDeviceUuid = "00000000-0000-4000-8000-000000000222"
const authenticatedMembershipUuid = "00000000-0000-4000-8000-000000000223"
const targetUserUuid = "00000000-0000-4000-8000-000000000224"
const targetMembershipUuid = "00000000-0000-4000-8000-000000000225"
const missingMembershipUuid = "00000000-0000-4000-8000-000000000226"
const databases: DatabaseConnection[] = []

const mail: IdentityMailAdapter = {
  sendRegisterVerifyEmail: async () => resultCreate(undefined),
  sendWelcome: async () => resultCreate(undefined),
  sendWelcomeMustVerify: async () => resultCreate(undefined),
}

function contextCreate(): { app: ReturnType<typeof serverAppCreate>; database: DatabaseConnection } {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Public Organization",
    "billing@example.com",
  ])
  const apiKeyResult = identityOrganizationApiKeySave(database, {
    uuid: apiKeyUuid,
    organizationUuid,
    type: 0,
    apiKey: "organization-secret",
    revisionDate: "2026-08-28T00:00:00.000Z",
  })
  if (!apiKeyResult.success) throw new Error(apiKeyResult.errorMessage)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate(),
      database,
      identifier: { uuid: () => "public-generated-id" },
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
  })
  return { app, database }
}

function authenticatedUserCreate(uuid: string, email: string, publicKey: string | null): IdentityUser {
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
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 600_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey,
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

function authenticatedDeviceCreate(userUuid: string): IdentityDevice {
  return {
    uuid: authenticatedDeviceUuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: "Task 27 device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "refresh-token",
    twoFactorRemember: null,
  }
}

function authenticatedContextCreate(): {
  app: ReturnType<typeof serverAppCreate>
  clock: ReturnType<typeof clockTestCreate>
  database: DatabaseConnection
  user: IdentityUser
  device: IdentityDevice
} {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  database.run("INSERT INTO organizations (uuid, name, billing_email, public_key) VALUES (?, ?, ?, ?)", [
    organizationUuid,
    "Public Organization",
    "billing@example.com",
    "organization-public-key",
  ])
  const user = authenticatedUserCreate(authenticatedUserUuid, "admin@example.com", null)
  const targetUser = authenticatedUserCreate(targetUserUuid, "target@example.com", "target-public-key")
  for (const candidate of [user, targetUser]) {
    const saveResult = identityUserSave(database, candidate)
    if (!saveResult.success) throw new Error(saveResult.errorMessage)
  }
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const device = authenticatedDeviceCreate(user.uuid)
  const deviceResult = identityDeviceSave(database, device, clock, false)
  if (!deviceResult.success) throw new Error(deviceResult.errorMessage)
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, invited_by_email, access_all, akey, status, atype, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      authenticatedMembershipUuid,
      user.uuid,
      organizationUuid,
      "billing@example.com",
      1,
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.admin,
      "admin-external-id",
    ],
  )
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, invited_by_email, access_all, akey, status, atype, external_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      targetMembershipUuid,
      targetUser.uuid,
      organizationUuid,
      "billing@example.com",
      0,
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.user,
      "target-external-id",
    ],
  )
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate(),
      database,
      identifier: { uuid: () => "generated-id" },
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
  })
  return { app, clock, database, user, device }
}

async function authenticatedTokenCreate(context: ReturnType<typeof authenticatedContextCreate>): Promise<string> {
  const now = Math.floor(context.clock.now().getTime() / 1_000)
  const claims = identityAccessTokenClaimsCreate(
    context.device,
    context.user,
    now - 1,
    now + 3_600,
    "web",
    "https://vault.example",
    identityConfigCreate(),
  )
  const result = await jwtSign(claims, keyPair.privateKey)
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

async function tokenCreate(exp = 1_787_878_800): Promise<string> {
  const claims = identityOrganizationApiKeyAccessTokenClaimsCreate(
    apiKeyUuid,
    organizationUuid,
    "https://vault.example",
    1_787_875_200,
    exp,
  )
  const result = await jwtSign(claims, keyPair.privateKey)
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("public organization import validates the organization token and returns an empty 200 response", async () => {
  const context = contextCreate()
  const response = await context.app.request("https://vault.example/api/public/organization/import", {
    body: JSON.stringify({
      groups: [],
      largeImport: true,
      members: [{ email: "Imported@Example.com", externalId: "member-1", deleted: false }],
      overwriteExisting: false,
    }),
    headers: {
      authorization: `Bearer ${await tokenCreate()}`,
      "content-type": "application/json",
    },
    method: "POST",
  })

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBeNull()
  expect(await response.text()).toBe("")
  expect(
    context.database.query("SELECT email, status FROM users JOIN users_organizations ON users.uuid = user_uuid").all(),
  ).toEqual([{ email: "imported@example.com", status: organizationMembershipStatus.invited }])
})

test("public organization import preserves exact token guard errors and request validation", async () => {
  const context = contextCreate()
  const missingToken = await context.app.request("https://vault.example/api/public/organization/import", {
    method: "POST",
  })
  expect(missingToken.status).toBe(401)
  expect((await missingToken.json()).message).toBe("No access token provided")

  const invalidBody = await context.app.request("https://vault.example/api/public/organization/import", {
    body: "not-json",
    headers: {
      authorization: `Bearer ${await tokenCreate()}`,
      "content-type": "application/json",
    },
    method: "POST",
  })
  expect(invalidBody.status).toBe(400)
  expect((await invalidBody.json()).message).toBe("Request body must be valid JSON.")

  const expired = await context.app.request("https://vault.example/api/public/organization/import", {
    body: JSON.stringify({ groups: [], members: [], overwriteExisting: false }),
    headers: { authorization: `Bearer ${await tokenCreate(1_787_875_199)}`, "content-type": "application/json" },
    method: "POST",
  })
  expect(expired.status).toBe(401)
  expect((await expired.json()).message).toBe("Token expired")
})

test("organization public-key routes return the canonical response and legacy alias", async () => {
  const context = authenticatedContextCreate()
  const token = await authenticatedTokenCreate(context)
  for (const path of [
    `/api/organizations/${organizationUuid}/public-key`,
    `/api/organizations/${organizationUuid}/keys`,
  ]) {
    const response = await context.app.request(`https://vault.example${path}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/json")
    expect(await response.json()).toEqual({ object: "organizationPublicKey", publicKey: "organization-public-key" })
  }
})

test("bulk organization public keys preserves order, null keys, and missing-member omission", async () => {
  const context = authenticatedContextCreate()
  const token = await authenticatedTokenCreate(context)
  const response = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/public-keys`,
    {
      body: JSON.stringify({ ids: [targetMembershipUuid, missingMembershipUuid, targetMembershipUuid] }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    data: [
      {
        object: "organizationUserPublicKeyResponseModel",
        id: targetMembershipUuid,
        userId: targetUserUuid,
        key: "target-public-key",
      },
      {
        object: "organizationUserPublicKeyResponseModel",
        id: targetMembershipUuid,
        userId: targetUserUuid,
        key: "target-public-key",
      },
    ],
    object: "list",
    continuationToken: null,
  })
})

test("bulk organization public keys ignores malformed membership ids like missing members", async () => {
  const context = authenticatedContextCreate()
  const token = await authenticatedTokenCreate(context)
  const response = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/public-keys`,
    {
      body: JSON.stringify({ ids: ["not-a-uuid"] }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ data: [], object: "list", continuationToken: null })
})

test("bulk organization public keys requires an admin membership", async () => {
  const context = authenticatedContextCreate()
  const token = await authenticatedTokenCreate(context)
  context.database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.user,
    authenticatedMembershipUuid,
  ])

  const response = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/public-keys`,
    {
      body: JSON.stringify({ ids: [targetMembershipUuid] }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
  )

  expect(response.status).toBe(401)
  expect((await response.json()).message).toBe("You need to be Admin or Owner to call this endpoint")
})

test("organization public-key routes reject non-members", async () => {
  const context = authenticatedContextCreate()
  const token = await authenticatedTokenCreate(context)
  context.database.run("DELETE FROM users_organizations WHERE uuid = ?", [authenticatedMembershipUuid])

  for (const path of [
    `/api/organizations/${organizationUuid}/public-key`,
    `/api/organizations/${organizationUuid}/keys`,
  ]) {
    const response = await context.app.request(`https://vault.example${path}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(401)
    expect((await response.json()).message).toBe("The current user isn't member of the organization")
  }
})
