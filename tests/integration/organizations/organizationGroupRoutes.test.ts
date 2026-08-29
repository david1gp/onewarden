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
const ownerUuid = "00000000-0000-4000-8000-000000000501"
const deviceUuid = "00000000-0000-4000-8000-000000000502"
const organizationUuid = "00000000-0000-4000-8000-000000000503"
const ownerMembershipUuid = "00000000-0000-4000-8000-000000000504"
const memberUuid = "00000000-0000-4000-8000-000000000505"
const memberMembershipUuid = "00000000-0000-4000-8000-000000000506"
const collectionUuid = "00000000-0000-4000-8000-000000000507"
const groupUuid = "00000000-0000-4000-8000-000000000508"
const secondGroupUuid = "00000000-0000-4000-8000-000000000509"
const databases: DatabaseConnection[] = []

async function ownerCreate(): Promise<IdentityUser> {
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordHashResult = await passwordHashCreate("group-password", salt, 100_000)
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
    name: "Group Owner",
    passwordHash: passwordHashResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "owner-akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "group-owner-stamp",
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
    name: "Group Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "group-refresh-token",
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
      "Group Member",
      new Uint8Array([1]),
      new Uint8Array([2]),
      100_000,
      "member-akey",
      "group-member-stamp",
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
    collectionUuid,
    organizationUuid,
    "Group Collection",
  ])
  const bundleResult = await identityTokenBundleCreate(
    owner,
    device,
    "group-client",
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
    identifier: identifierTestCreate([groupUuid, secondGroupUuid]),
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
  return { authorization: `Bearer ${token}`, "content-type": "application/json", "x-request-id": "group-test" }
}

function groupBody(name: string, accessAll: boolean, includeAccess: boolean, includeMember: boolean) {
  return {
    accessAll,
    collections: includeAccess ? [{ id: collectionUuid, hidePasswords: true, manage: false, readOnly: true }] : [],
    externalId: "  external-group-id  ",
    name,
    users: includeMember ? [memberMembershipUuid] : [],
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("group CRUD replaces and lists member and collection access with revisions and notifications", async () => {
  const context = await contextCreate()
  const groupsPath = `https://vault.example/api/organizations/${organizationUuid}/groups`
  const headers = jsonHeaders(context.token)

  const createResponse = await context.app.request(groupsPath, {
    body: JSON.stringify(groupBody("Created Group", false, true, true)),
    headers,
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  expect(await createResponse.json()).toEqual({
    accessAll: false,
    externalId: "  external-group-id  ",
    id: groupUuid,
    name: "Created Group",
    object: "group",
    organizationId: organizationUuid,
  })

  const groupPath = `${groupsPath}/${groupUuid}`
  const plainResponse = await context.app.request(groupPath, { headers })
  expect(plainResponse.status).toBe(200)
  expect(await plainResponse.json()).toEqual({
    externalId: "  external-group-id  ",
    id: groupUuid,
    name: "Created Group",
    object: "group",
    organizationId: organizationUuid,
  })

  const detailsResponse = await context.app.request(`${groupPath}/details`, { headers })
  expect(detailsResponse.status).toBe(200)
  expect(await detailsResponse.json()).toMatchObject({
    accessAll: false,
    collections: [{ id: collectionUuid, hidePasswords: true, manage: false, readOnly: true }],
    object: "groupDetails",
  })

  const listResponse = await context.app.request(groupsPath, { headers })
  expect(listResponse.status).toBe(200)
  expect(await listResponse.json()).toMatchObject({ data: [{ id: groupUuid, object: "group" }] })
  const detailsListResponse = await context.app.request(`${groupsPath}/details`, { headers })
  expect(detailsListResponse.status).toBe(200)
  expect(await detailsListResponse.json()).toMatchObject({
    data: [{ collections: [{ id: collectionUuid }], object: "groupDetails" }],
  })

  const usersPath = `${groupPath}/users`
  const usersResponse = await context.app.request(usersPath, { headers })
  expect(usersResponse.status).toBe(200)
  expect(await usersResponse.json()).toEqual([memberMembershipUuid])

  const replaceUsersResponse = await context.app.request(usersPath, {
    body: JSON.stringify([]),
    headers,
    method: "PUT",
  })
  expect(replaceUsersResponse.status).toBe(200)
  expect(context.database.query("SELECT COUNT(*) AS count FROM groups_users").get()).toEqual({ count: 0 })
  expect(context.database.query("SELECT updated_at FROM users WHERE uuid = ?").get(memberUuid)).toEqual({
    updated_at: "2026-08-28T00:00:00.000Z",
  })

  const updateResponse = await context.app.request(groupPath, {
    body: JSON.stringify({ ...groupBody("Updated Group", true, false, true), externalId: "updated-external-id" }),
    headers,
    method: "POST",
  })
  expect(updateResponse.status).toBe(200)
  expect(await updateResponse.json()).toMatchObject({
    accessAll: true,
    externalId: "  external-group-id  ",
    name: "Updated Group",
  })
  expect(context.database.query("SELECT access_all FROM groups WHERE uuid = ?").get(groupUuid)).toEqual({
    access_all: 1,
  })
  expect(context.database.query("SELECT COUNT(*) AS count FROM collections_groups").get()).toEqual({ count: 0 })

  const deleteMemberResponse = await context.app.request(`${groupPath}/delete-user/${memberMembershipUuid}`, {
    headers,
    method: "POST",
  })
  expect(deleteMemberResponse.status).toBe(200)
  const usersAfterDeleteResponse = await context.app.request(usersPath, { headers })
  expect(await usersAfterDeleteResponse.json()).toEqual([])

  const deleteResponse = await context.app.request(groupPath, { headers, method: "DELETE" })
  expect(deleteResponse.status).toBe(200)
  expect(context.database.query("SELECT COUNT(*) AS count FROM groups").get()).toEqual({ count: 0 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM collections_groups").get()).toEqual({ count: 0 })
  expect(context.notifications.length).toBeGreaterThan(0)
  expect(context.notifications).toContainEqual(
    expect.objectContaining({ type: 10, payload: { Date: "2026-08-28T00:00:00.000Z", UserId: memberUuid } }),
  )
})

test("bulk group deletion removes all assignments atomically and revises affected users", async () => {
  const context = await contextCreate()
  context.database.run("UPDATE users SET updated_at = ? WHERE uuid = ?", ["2026-08-27T00:00:00.000Z", memberUuid])
  const groupsPath = `https://vault.example/api/organizations/${organizationUuid}/groups`
  const headers = jsonHeaders(context.token)

  for (const [name, includeMember] of [
    ["Bulk Group One", true],
    ["Bulk Group Two", false],
  ] as const) {
    const response = await context.app.request(groupsPath, {
      body: JSON.stringify(groupBody(name, false, true, includeMember)),
      headers,
      method: "POST",
    })
    expect(response.status).toBe(200)
  }

  const response = await context.app.request(groupsPath, {
    body: JSON.stringify({ ids: [groupUuid, secondGroupUuid] }),
    headers,
    method: "DELETE",
  })
  expect(response.status).toBe(200)
  expect(context.database.query("SELECT COUNT(*) AS count FROM groups").get()).toEqual({ count: 0 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM groups_users").get()).toEqual({ count: 0 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM collections_groups").get()).toEqual({ count: 0 })
  expect(context.database.query("SELECT updated_at FROM users WHERE uuid = ?").get(memberUuid)).toEqual({
    updated_at: "2026-08-28T00:00:00.000Z",
  })
})

test("group list authorization distinguishes full and collection-managed access", async () => {
  const context = await contextCreate()
  const groupsPath = `https://vault.example/api/organizations/${organizationUuid}/groups`
  const headers = jsonHeaders(context.token)
  context.database.run("UPDATE users_organizations SET atype = ?, access_all = 0 WHERE uuid = ?", [
    organizationMembershipType.manager,
    ownerMembershipUuid,
  ])

  const deniedResponse = await context.app.request(groupsPath, { headers })
  expect(deniedResponse.status).toBe(404)
  context.database.run(
    "INSERT INTO users_collections (user_uuid, collection_uuid, read_only, hide_passwords, manage) VALUES (?, ?, ?, ?, ?)",
    [ownerUuid, collectionUuid, 0, 0, 1],
  )
  const allowedResponse = await context.app.request(groupsPath, { headers })
  expect(allowedResponse.status).toBe(200)
  const detailsResponse = await context.app.request(`${groupsPath}/details`, { headers })
  expect(detailsResponse.status).toBe(404)
})

test("profile organization serialization advertises enabled groups", async () => {
  const context = await contextCreate()
  const response = await context.app.request("https://vault.example/api/accounts/profile", {
    headers: jsonHeaders(context.token),
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ organizations: [{ useGroups: true }] })
})
