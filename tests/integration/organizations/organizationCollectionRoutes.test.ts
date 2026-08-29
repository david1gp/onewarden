import { afterEach, expect, test } from "bun:test"
import type { NotificationAdapter } from "../../../src/server/contexts/notifications/notificationAdapter.js"
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
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const ownerUuid = "00000000-0000-4000-8000-000000000401"
const deviceUuid = "00000000-0000-4000-8000-000000000402"
const organizationUuid = "00000000-0000-4000-8000-000000000403"
const ownerMembershipUuid = "00000000-0000-4000-8000-000000000404"
const memberUuid = "00000000-0000-4000-8000-000000000405"
const memberMembershipUuid = "00000000-0000-4000-8000-000000000406"
const initialCollectionUuid = "00000000-0000-4000-8000-000000000407"
const groupUuid = "00000000-0000-4000-8000-000000000408"
const createdCollectionUuid = "00000000-0000-4000-8000-000000000409"
const secondCollectionUuid = "00000000-0000-4000-8000-00000000040a"
const thirdCollectionUuid = "00000000-0000-4000-8000-00000000040b"
const databases: DatabaseConnection[] = []

async function ownerCreate(): Promise<IdentityUser> {
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordHashResult = await passwordHashCreate("collection-password", salt, 100_000)
  if (!passwordHashResult.success) throw new Error(passwordHashResult.errorMessage)
  return {
    uuid: ownerUuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "owner@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Collection Owner",
    passwordHash: passwordHashResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "owner-akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "collection-owner-stamp",
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

function ownerDeviceCreate(): IdentityDevice {
  return {
    uuid: deviceUuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid: ownerUuid,
    name: "Collection Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "collection-refresh-token",
    twoFactorRemember: null,
  }
}

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  notifications: unknown[]
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const config = identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 })
  const owner = await ownerCreate()
  const ownerResult = identityUserSave(database, owner)
  if (!ownerResult.success) throw new Error(ownerResult.errorMessage)
  const device = ownerDeviceCreate()
  const deviceResult = identityDeviceSave(database, device, clock, false)
  if (!deviceResult.success) throw new Error(deviceResult.errorMessage)
  database.run(
    "INSERT INTO users (uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      memberUuid,
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      "member@example.com",
      "Collection Member",
      new Uint8Array([1]),
      new Uint8Array([2]),
      100_000,
      "member-akey",
      "member-stamp",
    ],
  )
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Organization",
    "billing@example.com",
  ])
  database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      ownerMembershipUuid,
      ownerUuid,
      organizationUuid,
      1,
      "owner-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      memberMembershipUuid,
      memberUuid,
      organizationUuid,
      0,
      "member-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.user,
    ],
  )
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    initialCollectionUuid,
    organizationUuid,
    "Initial Collection",
  ])
  database.run(
    "INSERT INTO groups (uuid, organizations_uuid, name, creation_date, revision_date) VALUES (?, ?, ?, ?, ?)",
    [groupUuid, organizationUuid, "Collection Group", "2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z"],
  )
  database.run("INSERT INTO groups_users (groups_uuid, users_organizations_uuid) VALUES (?, ?)", [
    groupUuid,
    memberMembershipUuid,
  ])
  const bundleResult = await identityTokenBundleCreate(
    owner,
    device,
    "collection-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!bundleResult.success) throw new Error(bundleResult.errorMessage)
  const notifications: unknown[] = []
  const notification: NotificationAdapter = {
    sendUpdate: () => {},
    sendCipherUpdate: () => {},
    sendFolderUpdate: () => {},
    sendUserUpdate: (update) => notifications.push(update),
  }
  const app = serverAppCreate({
    clock,
    database,
    identifier: identifierTestCreate([createdCollectionUuid, secondCollectionUuid, thirdCollectionUuid]),
    identity: {
      clock,
      config,
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
    organizations: { groupsEnabled: true, notification },
  })
  return { app, database, notifications, token: bundleResult.data.accessToken }
}

function jsonHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json", "x-request-id": "collection-test" }
}

function collectionBody(collectionName: string, withAccess: boolean) {
  return {
    externalId: "  external-id  ",
    groups: withAccess ? [{ id: groupUuid, hidePasswords: true, manage: false, readOnly: true }] : [],
    name: collectionName,
    users: withAccess ? [{ id: memberMembershipUuid, hidePasswords: false, manage: true, readOnly: false }] : [],
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("collection routes replace group and user access, expose details, support aliases, and bulk operations", async () => {
  const context = await contextCreate()
  const collectionPath = `https://vault.example/api/organizations/${organizationUuid}/collections`
  const headers = jsonHeaders(context.token)

  const createResponse = await context.app.request(collectionPath, {
    body: JSON.stringify(collectionBody("Created Collection", true)),
    headers,
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  expect(await createResponse.json()).toMatchObject({
    externalId: "  external-id  ",
    id: createdCollectionUuid,
    name: "Created Collection",
    object: "collectionDetails",
  })

  const detailPath = `${collectionPath}/${createdCollectionUuid}/details`
  const detailResponse = await context.app.request(detailPath, { headers })
  expect(detailResponse.status).toBe(200)
  expect(await detailResponse.json()).toMatchObject({
    groups: [{ id: groupUuid, hidePasswords: true, manage: false, readOnly: true }],
    object: "collectionAccessDetails",
    users: [{ id: memberMembershipUuid, manage: true }],
  })
  const usersResponse = await context.app.request(`${collectionPath}/${createdCollectionUuid}/users`, { headers })
  expect(usersResponse.status).toBe(200)
  expect(await usersResponse.json()).toEqual([
    { hidePasswords: false, id: memberMembershipUuid, manage: true, readOnly: false },
  ])

  const putResponse = await context.app.request(detailPath.replace("/details", ""), {
    body: JSON.stringify(collectionBody("Updated Collection", false)),
    headers,
    method: "PUT",
  })
  expect(putResponse.status).toBe(200)
  expect((await putResponse.json()) as { name: string }).toMatchObject({ name: "Updated Collection" })
  const postUpdateResponse = await context.app.request(detailPath.replace("/details", ""), {
    body: JSON.stringify(collectionBody("Posted Collection", true)),
    headers,
    method: "POST",
  })
  expect(postUpdateResponse.status).toBe(200)
  expect((await postUpdateResponse.json()) as { name: string }).toMatchObject({ name: "Posted Collection" })

  const bulkAccessResponse = await context.app.request(`${collectionPath}/bulk-access`, {
    body: JSON.stringify({ collectionIds: [createdCollectionUuid], groups: [], users: [] }),
    headers,
    method: "POST",
  })
  expect(bulkAccessResponse.status).toBe(200)
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM collections_groups WHERE collections_uuid = ?")
      .get(createdCollectionUuid),
  ).toEqual({ count: 0 })
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM users_collections WHERE collection_uuid = ?")
      .get(createdCollectionUuid),
  ).toEqual({ count: 0 })

  for (const [collectionUuidToCreate, method] of [
    [secondCollectionUuid, "DELETE"],
    [thirdCollectionUuid, "POST"],
  ] as const) {
    const response = await context.app.request(collectionPath, {
      body: JSON.stringify(collectionBody(collectionUuidToCreate, false)),
      headers,
      method: "POST",
    })
    expect(response.status).toBe(200)
    if (method === "DELETE") {
      const deleteResponse = await context.app.request(`${collectionPath}/${collectionUuidToCreate}`, {
        headers,
        method,
      })
      expect(deleteResponse.status).toBe(200)
    } else {
      const deleteResponse = await context.app.request(`${collectionPath}/${collectionUuidToCreate}/delete`, {
        headers,
        method,
      })
      expect(deleteResponse.status).toBe(200)
    }
  }

  const bulkDeleteResponse = await context.app.request(collectionPath, {
    body: JSON.stringify({ ids: [initialCollectionUuid, createdCollectionUuid] }),
    headers,
    method: "DELETE",
  })
  expect(bulkDeleteResponse.status).toBe(200)
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM collections WHERE org_uuid = ?").get(organizationUuid),
  ).toEqual({ count: 0 })
  expect(context.notifications.length).toBeGreaterThan(0)
})

test("a manager without organization-wide access cannot create collections", async () => {
  const context = await contextCreate()
  context.database.run("UPDATE users_organizations SET atype = ?, access_all = 0 WHERE uuid = ?", [
    organizationMembershipType.manager,
    ownerMembershipUuid,
  ])
  const response = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/collections`,
    {
      body: JSON.stringify(collectionBody("Denied Collection", false)),
      headers: jsonHeaders(context.token),
      method: "POST",
    },
  )
  expect(response.status).toBe(400)
  expect((await response.json()).message).toBe("You don't have permission to create collections")
})
