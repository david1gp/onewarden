import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { organizationCreate } from "../../../src/server/contexts/organizations/organizationCreate.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const ownerUuid = "00000000-0000-4000-8000-000000000301"
const ownerDeviceUuid = "00000000-0000-4000-8000-000000000302"
const targetUuid = "00000000-0000-4000-8000-000000000303"
const organizationUuid = "00000000-0000-4000-8000-000000000304"
const ownerMembershipUuid = "00000000-0000-4000-8000-000000000305"
const targetMembershipUuid = "00000000-0000-4000-8000-000000000306"
const collectionUuid = "00000000-0000-4000-8000-000000000307"
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
    name: email === "owner@example.com" ? "Owner" : "Target",
    passwordHash: Uint8Array.of(1),
    salt: Uint8Array.of(1),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "user-key",
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

function deviceCreate(): IdentityDevice {
  return {
    uuid: ownerDeviceUuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid: ownerUuid,
    name: "Owner device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "owner-refresh-token",
    twoFactorRemember: null,
  }
}

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  notificationUpdates: Array<Record<string, unknown>>
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const config = identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 })
  const owner = userCreate(ownerUuid, "owner@example.com")
  const target = userCreate(targetUuid, "target@example.com")
  for (const user of [owner, target]) {
    const saveResult = identityUserSave(database, user)
    if (!saveResult.success) throw new Error(saveResult.errorMessage)
  }
  const device = deviceCreate()
  const deviceResult = identityDeviceSave(database, device, clock, false)
  if (!deviceResult.success) throw new Error(deviceResult.errorMessage)
  const organizationResult = organizationCreate(
    database,
    ownerUuid,
    {
      billingEmail: owner.email,
      collectionName: "Initial collection",
      key: "owner-key",
      name: "Organization",
      planType: 6,
    },
    clock,
    identifierTestCreate([organizationUuid, ownerMembershipUuid, collectionUuid]),
  )
  if (!organizationResult.success) throw new Error(organizationResult.errorMessage)
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      targetMembershipUuid,
      targetUuid,
      organizationUuid,
      "",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.user,
    ],
  )
  database.run(
    "INSERT INTO users_collections (user_uuid, collection_uuid, read_only, hide_passwords, manage) VALUES (?, ?, ?, ?, ?)",
    [targetUuid, collectionUuid, 1, 1, 0],
  )
  const bundleResult = await identityTokenBundleCreate(
    owner,
    device,
    "organization-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!bundleResult.success) throw new Error(bundleResult.errorMessage)
  const notificationUpdates: Array<Record<string, unknown>> = []
  const notification = {
    sendCipherUpdate: () => undefined,
    sendFolderUpdate: () => undefined,
    sendUpdate: () => undefined,
    sendUserUpdate: (update: Record<string, unknown>) => notificationUpdates.push(update),
  }
  return {
    app: serverAppCreate({
      clock,
      database,
      identity: {
        clock,
        config,
        database,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicOrigin: "https://vault.example",
        rateLimiter: { check: () => resultCreate(undefined) },
      },
      notifications: { enabled: false },
      organizations: { notification },
    }),
    database,
    notificationUpdates,
    token: bundleResult.data.accessToken,
  }
}

function headers(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("member list/details expose aliases, assignments, and normalized statuses", async () => {
  const context = await contextCreate()
  const base = `https://vault.example/api/organizations/${organizationUuid}/users`

  const listResponse = await context.app.request(base, { headers: headers(context.token) })
  expect(listResponse.status).toBe(200)
  expect(await listResponse.json()).toMatchObject({
    object: "list",
    data: [
      { id: ownerMembershipUuid, object: "organizationUserUserDetails", type: organizationMembershipType.owner },
      { id: targetMembershipUuid, object: "organizationUserUserDetails", type: organizationMembershipType.user },
    ],
  })

  const miniResponse = await context.app.request(`${base}/mini-details`, { headers: headers(context.token) })
  expect(miniResponse.status).toBe(200)
  expect(await miniResponse.json()).toMatchObject({
    object: "list",
    data: [
      { id: ownerMembershipUuid, object: "organizationUserUserMiniDetails" },
      { id: targetMembershipUuid, object: "organizationUserUserMiniDetails" },
    ],
  })

  const detailsResponse = await context.app.request(
    `${base}/${targetMembershipUuid}?includeCollections=true&includeGroups=true`,
    { headers: headers(context.token) },
  )
  expect(detailsResponse.status).toBe(200)
  expect(await detailsResponse.json()).toMatchObject({
    collections: [{ hidePasswords: true, id: collectionUuid, manage: false, readOnly: true }],
    id: targetMembershipUuid,
    name: "Target",
    status: organizationMembershipStatus.confirmed,
  })

  const revokeResponse = await context.app.request(`${base}/${targetMembershipUuid}/revoke`, {
    headers: headers(context.token),
    method: "PUT",
  })
  expect(revokeResponse.status).toBe(200)
  expect(
    context.database.query("SELECT status FROM users_organizations WHERE uuid = ?").get(targetMembershipUuid),
  ).toEqual({
    status: organizationMembershipStatus.confirmed - 128,
  })
  const revokedDetailsResponse = await context.app.request(`${base}/${targetMembershipUuid}`, {
    headers: headers(context.token),
  })
  expect((await revokedDetailsResponse.json()).status).toBe(organizationMembershipStatus.revoked)

  const restoreResponse = await context.app.request(`${base}/${targetMembershipUuid}/restore/vnext`, {
    headers: headers(context.token),
    method: "PUT",
  })
  expect(restoreResponse.status).toBe(200)
  expect(
    context.database.query("SELECT status FROM users_organizations WHERE uuid = ?").get(targetMembershipUuid),
  ).toEqual({
    status: organizationMembershipStatus.confirmed,
  })
})

test("member details only infer collections from groups for the individual endpoint", async () => {
  const context = await contextCreate()
  const base = `https://vault.example/api/organizations/${organizationUuid}/users`

  const listResponse = await context.app.request(`${base}?includeGroups=true`, { headers: headers(context.token) })
  expect(listResponse.status).toBe(200)
  expect(
    (await listResponse.json()).data.find((member: { id: string }) => member.id === targetMembershipUuid).collections,
  ).toEqual([])

  const detailsResponse = await context.app.request(`${base}/${targetMembershipUuid}?includeGroups=true`, {
    headers: headers(context.token),
  })
  expect(detailsResponse.status).toBe(200)
  expect((await detailsResponse.json()).collections).toEqual([
    { hidePasswords: true, id: collectionUuid, manage: false, readOnly: true },
  ])
})

test("member update aliases replace assignments and bulk remove preserves owner protection", async () => {
  const context = await contextCreate()
  const base = `https://vault.example/api/organizations/${organizationUuid}/users`
  const updateBody = JSON.stringify({
    collections: [],
    groups: [],
    permissions: {},
    type: "Manager",
  })
  const putResponse = await context.app.request(`${base}/${targetMembershipUuid}`, {
    body: updateBody,
    headers: headers(context.token),
    method: "PUT",
  })
  expect(putResponse.status).toBe(200)
  expect(
    context.database
      .query("SELECT atype, access_all FROM users_organizations WHERE uuid = ?")
      .get(targetMembershipUuid),
  ).toEqual({
    access_all: 0,
    atype: organizationMembershipType.manager,
  })
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM users_collections WHERE user_uuid = ? AND collection_uuid = ?")
      .get(targetUuid, collectionUuid),
  ).toEqual({
    count: 0,
  })

  const postResponse = await context.app.request(`${base}/${targetMembershipUuid}`, {
    body: JSON.stringify({
      permissions: { createNewCollections: true, deleteAnyCollection: true, editAnyCollection: true },
      collections: [
        { hidePasswords: false, id: "00000000-0000-4000-8000-000000000399", manage: false, readOnly: true },
      ],
      groups: [],
      type: "Custom",
    }),
    headers: headers(context.token),
    method: "POST",
  })
  expect(postResponse.status).toBe(200)
  expect(
    context.database
      .query("SELECT atype, access_all FROM users_organizations WHERE uuid = ?")
      .get(targetMembershipUuid),
  ).toEqual({
    access_all: 1,
    atype: organizationMembershipType.manager,
  })

  const bulkResponse = await context.app.request(base, {
    body: JSON.stringify({ ids: [targetMembershipUuid, "00000000-0000-4000-8000-000000000399"] }),
    headers: headers(context.token),
    method: "DELETE",
  })
  expect(bulkResponse.status).toBe(200)
  expect(await bulkResponse.json()).toMatchObject({
    data: [
      { error: "", id: targetMembershipUuid, object: "OrganizationBulkConfirmResponseModel" },
      { id: "00000000-0000-4000-8000-000000000399", object: "OrganizationBulkConfirmResponseModel" },
    ],
  })
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM users_organizations WHERE uuid = ?")
      .get(targetMembershipUuid),
  ).toEqual({
    count: 0,
  })
  expect(context.notificationUpdates).toContainEqual({
    contextId: ownerDeviceUuid,
    payload: { Date: "2026-08-28T00:00:00.000Z", UserId: targetUuid },
    type: 6,
  })

  const lastOwnerResponse = await context.app.request(`${base}/${ownerMembershipUuid}`, {
    headers: headers(context.token),
    method: "DELETE",
  })
  expect(lastOwnerResponse.status).toBe(400)
  expect((await lastOwnerResponse.json()).message).toBe("Can't delete the last owner")

  const lastOwnerUpdateResponse = await context.app.request(`${base}/${ownerMembershipUuid}`, {
    body: JSON.stringify({ collections: [], groups: [], type: organizationMembershipType.user }),
    headers: headers(context.token),
    method: "PUT",
  })
  expect(lastOwnerUpdateResponse.status).toBe(400)
  expect((await lastOwnerUpdateResponse.json()).message).toBe("Can't delete the last owner")

  const lastOwnerRevokeResponse = await context.app.request(`${base}/${ownerMembershipUuid}/revoke`, {
    headers: headers(context.token),
    method: "PUT",
  })
  expect(lastOwnerRevokeResponse.status).toBe(400)
  expect((await lastOwnerRevokeResponse.json()).message).toBe("You cannot revoke yourself")
})

test("bulk revoke, restore, and reinvite use upstream response objects and per-member results", async () => {
  const context = await contextCreate()
  const base = `https://vault.example/api/organizations/${organizationUuid}/users`
  const missingMembershipUuid = "00000000-0000-4000-8000-000000000399"

  const revokeResponse = await context.app.request(`${base}/revoke`, {
    body: JSON.stringify({ ids: [targetMembershipUuid, missingMembershipUuid] }),
    headers: headers(context.token),
    method: "PUT",
  })
  expect(revokeResponse.status).toBe(200)
  expect(await revokeResponse.json()).toMatchObject({
    continuationToken: null,
    data: [
      { error: "", id: targetMembershipUuid, object: "OrganizationUserBulkResponseModel" },
      { id: missingMembershipUuid, object: "OrganizationUserBulkResponseModel" },
    ],
    object: "list",
  })
  expect(
    context.database
      .query(
        "SELECT users_organizations.status, users.updated_at FROM users_organizations INNER JOIN users ON users.uuid = users_organizations.user_uuid WHERE users_organizations.uuid = ?",
      )
      .get(targetMembershipUuid),
  ).toEqual({ status: organizationMembershipStatus.confirmed - 128, updated_at: "2026-08-28T00:00:00.000Z" })

  const restoreResponse = await context.app.request(`${base}/restore`, {
    body: JSON.stringify({ ids: [targetMembershipUuid, missingMembershipUuid] }),
    headers: headers(context.token),
    method: "PUT",
  })
  expect(restoreResponse.status).toBe(200)
  expect(await restoreResponse.json()).toMatchObject({
    data: [
      { error: "", id: targetMembershipUuid, object: "OrganizationUserBulkResponseModel" },
      { id: missingMembershipUuid, object: "OrganizationUserBulkResponseModel" },
    ],
  })
  expect(
    context.database.query("SELECT status FROM users_organizations WHERE uuid = ?").get(targetMembershipUuid),
  ).toEqual({ status: organizationMembershipStatus.confirmed })

  context.database.run("UPDATE users_organizations SET status = ? WHERE uuid = ?", [
    organizationMembershipStatus.invited,
    targetMembershipUuid,
  ])
  const reinviteResponse = await context.app.request(`${base}/reinvite`, {
    body: JSON.stringify({ ids: [targetMembershipUuid, missingMembershipUuid] }),
    headers: headers(context.token),
    method: "POST",
  })
  expect(reinviteResponse.status).toBe(200)
  expect(await reinviteResponse.json()).toMatchObject({
    data: [
      { error: "", id: targetMembershipUuid, object: "OrganizationBulkConfirmResponseModel" },
      { id: missingMembershipUuid, object: "OrganizationBulkConfirmResponseModel" },
    ],
  })
  expect(
    context.database.query("SELECT status FROM users_organizations WHERE uuid = ?").get(targetMembershipUuid),
  ).toEqual({ status: organizationMembershipStatus.accepted })
})
