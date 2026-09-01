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
import { jwtSign } from "../../../src/shared/crypto/jwtSign.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { organizationApiClientCreate } from "../../../src/web/organizations/api/organizationApiClientCreate.js"
import { bitwardenOrganizationJsonExportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationJsonExportExecute.js"
import { bitwardenOrganizationJsonImportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationJsonImportExecute.js"
import organizationJsonFixture from "../../fixtures/bitwardenOrganizationJsonTask8.json"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const userUuid = "00000000-0000-4000-8000-000000000101"
const deviceUuid = "00000000-0000-4000-8000-000000000102"
const organizationUuid = "00000000-0000-4000-8000-000000000103"
const membershipUuid = "00000000-0000-4000-8000-000000000104"
const collectionUuid = "00000000-0000-4000-8000-000000000105"
const invitedUserUuid = "00000000-0000-4000-8000-000000000106"
const invitedSecurityStamp = "00000000-0000-4000-8000-000000000107"
const domainUuid = "00000000-0000-4000-8000-000000000108"
const databases: DatabaseConnection[] = []

async function userCreate(): Promise<IdentityUser> {
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordHashResult = await passwordHashCreate("organization-password", salt, 100_000)
  if (!passwordHashResult.success) throw new Error(passwordHashResult.errorMessage)
  return {
    uuid: userUuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "owner@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Organization Owner",
    passwordHash: passwordHashResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "user-akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "organization-owner-stamp",
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
    name: "Organization Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "organization-refresh-token",
    twoFactorRemember: null,
  }
}

async function contextCreate(configOverrides: Parameters<typeof identityConfigCreate>[0] = {}): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const config = identityConfigCreate({ PASSWORD_ITERATIONS: 100_000, ...configOverrides })
  const user = await userCreate()
  const userResult = identityUserSave(database, user)
  if (!userResult.success) throw new Error(userResult.errorMessage)
  const device = deviceCreate()
  const deviceResult = identityDeviceSave(database, device, clock, false)
  if (!deviceResult.success) throw new Error(deviceResult.errorMessage)
  const bundleResult = await identityTokenBundleCreate(
    user,
    device,
    "organization-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!bundleResult.success) throw new Error(bundleResult.errorMessage)
  const app = serverAppCreate({
    clock,
    database,
    identifier: identifierTestCreate([
      organizationUuid,
      membershipUuid,
      collectionUuid,
      invitedUserUuid,
      invitedSecurityStamp,
      domainUuid,
      "00000000-0000-4000-8000-000000000109",
      "00000000-0000-4000-8000-000000000110",
      "00000000-0000-4000-8000-000000000111",
      "00000000-0000-4000-8000-000000000112",
    ]),
    identity: {
      clock,
      config,
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
  })
  return { app, database, token: bundleResult.data.accessToken }
}

function jsonHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json", "x-request-id": "organization-test" }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization CRUD, keys, aliases, and persistence match upstream behavior", async () => {
  const context = await contextCreate()
  const url = `https://vault.example/api/organizations/${organizationUuid}`

  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "Billing@Example.COM",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: "4",
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  expect(await createResponse.json()).toMatchObject({
    id: organizationUuid,
    name: "Organization",
    billingEmail: "billing@example.com",
    seats: null,
    maxCollections: null,
    maxStorageGb: 32_767,
    planType: 6,
    hasPublicAndPrivateKeys: false,
    object: "organization",
  })
  expect(
    context.database.query("SELECT name, billing_email FROM organizations WHERE uuid = ?").get(organizationUuid),
  ).toEqual({
    name: "Organization",
    billing_email: "billing@example.com",
  })
  expect(context.database.query("PRAGMA table_info(organizations)").all()).toEqual([
    { cid: 0, dflt_value: null, name: "uuid", notnull: 1, pk: 1, type: "TEXT" },
    { cid: 1, dflt_value: null, name: "name", notnull: 1, pk: 0, type: "TEXT" },
    { cid: 2, dflt_value: null, name: "billing_email", notnull: 1, pk: 0, type: "TEXT" },
    { cid: 3, dflt_value: null, name: "private_key", notnull: 0, pk: 0, type: "TEXT" },
    { cid: 4, dflt_value: null, name: "public_key", notnull: 0, pk: 0, type: "TEXT" },
    { cid: 5, dflt_value: null, name: "identifier", notnull: 0, pk: 0, type: "TEXT" },
  ])
  expect(
    context.database
      .query("SELECT access_all, akey, status, atype FROM users_organizations WHERE uuid = ?")
      .get(membershipUuid),
  ).toEqual({
    access_all: 1,
    akey: "encrypted-owner-key",
    status: organizationMembershipStatus.confirmed,
    atype: organizationMembershipType.owner,
  })
  expect(context.database.query("SELECT name FROM collections WHERE uuid = ?").get(collectionUuid)).toEqual({
    name: "Initial Collection",
  })

  const getResponse = await context.app.request(url, { headers: { authorization: `Bearer ${context.token}` } })
  expect(getResponse.status).toBe(200)
  expect((await getResponse.json()) as { object: string }).toMatchObject({ object: "organization" })

  const putResponse = await context.app.request(url, {
    body: JSON.stringify({ billingEmail: "Updated@Example.COM", name: "Renamed Organization" }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(putResponse.status).toBe(200)
  expect(await putResponse.json()).toMatchObject({
    name: "Renamed Organization",
    billingEmail: "updated@example.com",
  })

  const postResponse = await context.app.request(url, {
    body: JSON.stringify({ billingEmail: "Again@Example.COM", name: "Posted Organization" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(postResponse.status).toBe(200)
  expect(await postResponse.json()).toMatchObject({ name: "Posted Organization", billingEmail: "again@example.com" })

  const keysResponse = await context.app.request(`${url}/keys`, {
    body: JSON.stringify({ encryptedPrivateKey: "encrypted-private-key", publicKey: "public-key" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(keysResponse.status).toBe(200)
  expect(await keysResponse.json()).toEqual({
    object: "organizationKeys",
    publicKey: "public-key",
    privateKey: "encrypted-private-key",
  })
  expect(
    context.database.query("SELECT private_key, public_key FROM organizations WHERE uuid = ?").get(organizationUuid),
  ).toEqual({
    private_key: "encrypted-private-key",
    public_key: "public-key",
  })

  const secondKeysResponse = await context.app.request(`${url}/keys`, {
    body: JSON.stringify({ encryptedPrivateKey: "another-private-key", publicKey: "another-public-key" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(secondKeysResponse.status).toBe(400)
  expect((await secondKeysResponse.json()).message).toBe("Organization Keys already exist")

  const deleteResponse = await context.app.request(url, {
    body: JSON.stringify({ MasterPasswordHash: "organization-password" }),
    headers: jsonHeaders(context.token),
    method: "DELETE",
  })
  expect(deleteResponse.status).toBe(200)
  expect(await deleteResponse.text()).toBe("")
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM organizations WHERE uuid = ?").get(organizationUuid),
  ).toEqual({ count: 0 })
})

test("organization billing compatibility returns plans, empty metadata, warnings, and self-host limits", async () => {
  const context = await contextCreate()
  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 2,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)

  const plansResponse = await context.app.request("https://vault.example/api/plans")
  expect(plansResponse.status).toBe(200)
  expect(await plansResponse.json()).toEqual({
    object: "list",
    data: [
      {
        object: "plan",
        type: 0,
        product: 0,
        name: "Free",
        nameLocalizationKey: "planNameFree",
        bitwardenProduct: 0,
        maxUsers: 0,
        descriptionLocalizationKey: "planDescFree",
      },
      {
        object: "plan",
        type: 0,
        product: 1,
        name: "Free",
        nameLocalizationKey: "planNameFree",
        bitwardenProduct: 1,
        maxUsers: 0,
        descriptionLocalizationKey: "planDescFree",
      },
    ],
    continuationToken: null,
  })

  const billingHeaders = { authorization: `Bearer ${context.token}` }
  const metadataResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/billing/metadata`,
    { headers: billingHeaders },
  )
  expect(metadataResponse.status).toBe(200)
  expect(await metadataResponse.json()).toEqual({ object: "list", data: [], continuationToken: null })

  const warningsResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/billing/vnext/warnings`,
    { headers: billingHeaders },
  )
  expect(warningsResponse.status).toBe(200)
  expect(await warningsResponse.json()).toEqual({
    freeTrial: null,
    inactiveSubscription: null,
    resellerRenewal: null,
    taxId: null,
  })

  const selfHostMetadataResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/billing/vnext/self-host/metadata`,
    { headers: billingHeaders },
  )
  expect(selfHostMetadataResponse.status).toBe(200)
  expect(await selfHostMetadataResponse.json()).toEqual({
    isOnSecretsManagerStandalone: false,
    organizationOccupiedSeats: 0,
  })
})

test("organization creation requires a plan type", async () => {
  const context = await contextCreate()
  const response = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ object: "error" })
  expect(context.database.query("SELECT COUNT(*) AS count FROM organizations").get()).toEqual({ count: 0 })
})

test("organization creation rejects a non-integer numeric plan type", async () => {
  const context = await contextCreate()
  const response = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 4.5,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ object: "error" })
  expect(context.database.query("SELECT COUNT(*) AS count FROM organizations").get()).toEqual({ count: 0 })
})

test("organization creation honors the configured user allow list", async () => {
  const context = await contextCreate({ ORG_CREATION_USERS: "allowed@example.com" })
  const response = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 6,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })

  expect(response.status).toBe(400)
  expect((await response.json()).message).toBe("User not allowed to create organizations")
  expect(context.database.query("SELECT COUNT(*) AS count FROM organizations").get()).toEqual({ count: 0 })
})

test("organization key retrieval, API-key rotation, and export preserve core compatibility", async () => {
  const context = await contextCreate()
  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      keys: { encryptedPrivateKey: "encrypted-private-key", publicKey: "public-key" },
      name: "Organization",
      planType: 6,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)

  for (const path of [`${organizationUuid}/public-key`, `${organizationUuid}/keys`]) {
    const response = await context.app.request(`https://vault.example/api/organizations/${path}`, {
      headers: { authorization: `Bearer ${context.token}` },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ object: "organizationPublicKey", publicKey: "public-key" })
  }

  const apiKeyRequest = {
    body: JSON.stringify({ MasterPasswordHash: "organization-password" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  } as const
  const createApiKeyResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/api-key`,
    apiKeyRequest,
  )
  expect(createApiKeyResponse.status).toBe(200)
  const createdApiKey = await createApiKeyResponse.json()
  expect(createdApiKey).toMatchObject({ object: "apiKey", revisionDate: "2026-08-28T00:00:00.000Z" })
  expect(createdApiKey.apiKey).toMatch(/^[A-Za-z0-9]{30}$/)

  const repeatedApiKeyResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/api-key`,
    apiKeyRequest,
  )
  expect(await repeatedApiKeyResponse.json()).toEqual(createdApiKey)

  const invalidApiKeyResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/api-key`,
    {
      body: JSON.stringify({ masterPasswordHash: "wrong" }),
      headers: jsonHeaders(context.token),
      method: "POST",
    },
  )
  expect(invalidApiKeyResponse.status).toBe(400)
  expect((await invalidApiKeyResponse.json()).message).toBe("Invalid password")

  const rotateApiKeyResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/rotate-api-key`,
    apiKeyRequest,
  )
  const rotatedApiKey = await rotateApiKeyResponse.json()
  expect(rotatedApiKey).toMatchObject({ object: "apiKey", revisionDate: "2026-08-28T00:00:00.000Z" })
  expect(rotatedApiKey.apiKey).toMatch(/^[A-Za-z0-9]{30}$/)
  expect(rotatedApiKey.apiKey).not.toBe(createdApiKey.apiKey)

  const cipherUuid = "00000000-0000-4000-8000-00000000010f"
  context.database.run(
    `INSERT INTO ciphers (uuid, created_at, updated_at, organization_uuid, atype, name, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cipherUuid,
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      organizationUuid,
      1,
      "Exported login",
      JSON.stringify({ Password: "encrypted-password" }),
    ],
  )
  const exportResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/export`,
    { headers: { authorization: `Bearer ${context.token}` } },
  )
  expect(exportResponse.status).toBe(200)
  const exportBody = await exportResponse.json()
  expect(exportBody.collections).toEqual([
    {
      defaultUserCollectionEmail: null,
      externalId: null,
      id: collectionUuid,
      name: "Initial Collection",
      object: "collection",
      organizationId: organizationUuid,
      type: 0,
    },
  ])
  expect(exportBody.ciphers).toHaveLength(1)
  expect(exportBody.ciphers[0]).toMatchObject({
    id: cipherUuid,
    login: { password: "encrypted-password" },
    name: "Exported login",
    object: "cipherDetails",
  })
  for (const field of ["archivedDate", "edit", "favorite", "folderId", "permissions", "viewPassword"])
    expect(exportBody.ciphers[0]).not.toHaveProperty(field)
})

test("the final organization owner cannot leave", async () => {
  const context = await contextCreate()
  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 6,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)

  const leaveResponse = await context.app.request(`https://vault.example/api/organizations/${organizationUuid}/leave`, {
    headers: { authorization: `Bearer ${context.token}` },
    method: "POST",
  })
  expect(leaveResponse.status).toBe(400)
  expect((await leaveResponse.json()).message).toBe("The last owner can't leave")
  expect(context.database.query("SELECT COUNT(*) AS count FROM users_organizations").get()).toEqual({ count: 1 })
})

test("organization JSON import and export use the permission-enforcing API routes", async () => {
  const context = await contextCreate()
  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 6,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)

  const session = {
    session: () => ({
      accessToken: context.token,
      email: "owner@example.com",
      encryptedUserKey: "encrypted-user-key",
      expiresAt: Date.now() + 60_000,
      kdf: 0,
      kdfIterations: 100_000,
      kdfMemory: null,
      kdfParallelism: null,
      refreshToken: "organization-refresh-token",
      tokenType: "Bearer",
      userId: userUuid,
    }),
  } as ReturnType<typeof webAuthSessionCreate>
  const apiClient = organizationApiClientCreate({
    baseUrl: "https://vault.example",
    fetchFn: async (input, init) => context.app.request(String(input), init),
    token: () => context.token,
  })
  const organizationKey = new Uint8Array(64).fill(2)

  const importResult = await bitwardenOrganizationJsonImportExecute({
    apiClient,
    organizationId: organizationUuid,
    organizationKey,
    rawContent: JSON.stringify({
      ...organizationJsonFixture,
      collections: organizationJsonFixture.collections.map((collection) => ({
        ...collection,
        organizationId: organizationUuid,
      })),
      items: organizationJsonFixture.items.map((item) => ({ ...item, organizationId: organizationUuid })),
    }),
    session,
  })
  expect(importResult).toMatchObject({ success: true, data: { cipherCount: 4, collectionCount: 2, warnings: [] } })
  expect(
    context.database.query("SELECT atype AS type, COUNT(*) AS count FROM ciphers GROUP BY atype ORDER BY atype").all(),
  ).toEqual([
    { type: 1, count: 1 },
    { type: 2, count: 1 },
    { type: 3, count: 1 },
    { type: 4, count: 1 },
  ])

  const exportResult = await bitwardenOrganizationJsonExportExecute({
    apiClient,
    organizationId: organizationUuid,
    organizationKey,
    session,
  })
  expect(exportResult.success).toBe(true)
  if (!exportResult.success) return
  const exported = JSON.parse(exportResult.data.content) as typeof organizationJsonFixture
  expect(exported.collections.map((collection) => collection.name)).toEqual([
    "Initial Collection",
    "Engineering",
    "Shared",
  ])
  expect(exported.items.map((item) => item.name)).toEqual([
    "Example Organization Login",
    "Example Organization Note",
    "Example Organization Card",
    "Example Organization Identity",
  ])
  expect(exported.items.every((item) => item.collectionIds && item.collectionIds.length > 0)).toBe(true)

  context.database.run("DELETE FROM users_organizations WHERE user_uuid = ? AND org_uuid = ?", [
    userUuid,
    organizationUuid,
  ])
  const deniedImportResponse = await context.app.request(
    `https://vault.example/api/ciphers/import-organization?organizationId=${organizationUuid}`,
    {
      body: JSON.stringify({ ciphers: [], collections: [], collectionRelationships: [] }),
      headers: jsonHeaders(context.token),
      method: "POST",
    },
  )
  expect(deniedImportResponse.status).toBe(401)
})

test("organization policy list, get, create-update, aliases, and authorization match upstream behavior", async () => {
  const context = await contextCreate()
  const organizationUrl = `https://vault.example/api/organizations/${organizationUuid}`
  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 6,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)

  const listUrl = `${organizationUrl}/policies`
  const listResponse = await context.app.request(listUrl, {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(listResponse.status).toBe(200)
  expect(await listResponse.json()).toEqual({ data: [], object: "list", continuationToken: null })

  const defaultResponse = await context.app.request(`${listUrl}/8`, {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(defaultResponse.status).toBe(200)
  expect(await defaultResponse.json()).toMatchObject({
    organizationId: organizationUuid,
    type: 8,
    data: null,
    enabled: false,
    revisionDate: "2026-08-28T00:00:00.000Z",
    object: "policy",
    canToggleState: true,
  })

  const putResponse = await context.app.request(`${listUrl}/8`, {
    body: JSON.stringify({ policy: { enabled: true, data: { autoEnrollEnabled: true } } }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(putResponse.status).toBe(200)
  const createdPolicy = await putResponse.json()
  expect(createdPolicy).toMatchObject({
    organizationId: organizationUuid,
    type: 8,
    data: { autoEnrollEnabled: true },
    enabled: true,
    canToggleState: true,
    object: "policy",
  })
  expect(
    context.database
      .query("SELECT org_uuid, atype, enabled, data FROM org_policies WHERE uuid = ?")
      .get(createdPolicy.id),
  ).toEqual({
    org_uuid: organizationUuid,
    atype: 8,
    enabled: 1,
    data: JSON.stringify({ autoEnrollEnabled: true }),
  })

  const vnextResponse = await context.app.request(`${listUrl}/8/vnext`, {
    body: JSON.stringify({ policy: { enabled: false } }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(vnextResponse.status).toBe(200)
  expect(await vnextResponse.json()).toMatchObject({ id: createdPolicy.id, enabled: false, data: null, type: 8 })
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM org_policies WHERE org_uuid = ? AND atype = ?")
      .get(organizationUuid, 8),
  ).toEqual({ count: 1 })

  const inviteTokenResult = await jwtSign(
    {
      email: "owner@example.com",
      exp: Math.floor(Date.parse("2026-08-28T00:00:00.000Z") / 1_000) + 3_600,
      invited_by_email: "owner@example.com",
      iss: "https://vault.example|invite",
      member_id: membershipUuid,
      nbf: Math.floor(Date.parse("2026-08-28T00:00:00.000Z") / 1_000),
      org_id: organizationUuid,
      sub: userUuid,
    },
    keyPair.privateKey,
  )
  if (!inviteTokenResult.success) throw new Error(inviteTokenResult.errorMessage)
  const tokenListResponse = await context.app.request(
    `${listUrl}/token?token=${encodeURIComponent(inviteTokenResult.data)}`,
  )
  expect(tokenListResponse.status).toBe(200)
  expect(await tokenListResponse.json()).toMatchObject({ object: "list", continuationToken: null })

  const masterResponse = await context.app.request(`${listUrl}/master-password`, {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(masterResponse.status).toBe(200)
  expect(await masterResponse.json()).toMatchObject({
    organizationId: organizationUuid,
    type: 1,
    data: null,
    enabled: false,
    object: "policy",
  })

  const dummyResponse = await context.app.request(
    "https://vault.example/api/organizations/00000000-01DC-01DC-01DC-000000000000/policies/master-password",
  )
  expect(dummyResponse.status).toBe(200)
  expect(await dummyResponse.json()).toMatchObject({
    organizationId: "00000000-01DC-01DC-01DC-000000000000",
    type: 1,
    data: null,
    enabled: false,
    object: "policy",
  })

  const unauthorizedResponse = await context.app.request(listUrl)
  expect(unauthorizedResponse.status).toBe(401)
  const unsupportedResponse = await context.app.request(`${listUrl}/4`, {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(unsupportedResponse.status).toBe(400)
  expect((await unsupportedResponse.json()).message).toBe("Invalid or unsupported policy type")
})

test("organization domains support CRUD, verification, aliases, and anonymous SSO lookup", async () => {
  const context = await contextCreate()
  const organizationUrl = `https://vault.example/api/organizations/${organizationUuid}`
  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 6,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)

  const domainResponse = await context.app.request(`${organizationUrl}/domain`, {
    body: JSON.stringify({ domainName: "Example.Invalid" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(domainResponse.status).toBe(200)
  const domain = await domainResponse.json()
  expect(domain).toMatchObject({
    domainName: "example.invalid",
    organizationId: organizationUuid,
    object: "organizationDomain",
    verifiedDate: null,
  })
  expect(domain.txt).toMatch(/^bw=/u)

  const listResponse = await context.app.request(`${organizationUrl}/domain`, {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(listResponse.status).toBe(200)
  expect(await listResponse.json()).toMatchObject({
    data: [expect.objectContaining({ id: domain.id, domainName: "example.invalid" })],
    object: "list",
  })

  const verifyResponse = await context.app.request(`${organizationUrl}/domain/${domain.id}/verify`, {
    headers: { authorization: `Bearer ${context.token}` },
    method: "POST",
  })
  expect(verifyResponse.status).toBe(200)
  expect(await verifyResponse.json()).toMatchObject({ id: domain.id, verifiedDate: null })

  const aliasResponse = await context.app.request(`${organizationUrl}/domain/${domain.id}/remove`, {
    headers: { authorization: `Bearer ${context.token}` },
    method: "POST",
  })
  expect(aliasResponse.status).toBe(200)
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM organization_domains WHERE uuid = ?").get(domain.id),
  ).toEqual({ count: 0 })

  context.database.run(
    `INSERT INTO organization_domains (
       uuid, org_uuid, txt, domain_name, creation_date, next_run_date, verified_date
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      domainUuid,
      organizationUuid,
      "bw=verified",
      "example.com",
      "2026-08-28T00:00:00.000Z",
      "2026-08-29T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
    ],
  )
  context.database.run("UPDATE organizations SET identifier = ? WHERE uuid = ?", ["organization-sso", organizationUuid])
  const ssoLookupResponse = await context.app.request("https://vault.example/api/organizations/domain/sso/verified", {
    body: JSON.stringify({ email: "person@example.com" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(ssoLookupResponse.status).toBe(200)
  expect(await ssoLookupResponse.json()).toMatchObject({
    data: [
      {
        domainName: "example.com",
        object: "verifiedOrganizationDomainSsoDetails",
        organizationIdentifier: "organization-sso",
        organizationName: "Organization",
      },
    ],
    object: "list",
  })
})

test("organization SSO configuration supports get and create-update", async () => {
  const context = await contextCreate()
  const organizationUrl = `https://vault.example/api/organizations/${organizationUuid}`
  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 6,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)

  const initialResponse = await context.app.request(`${organizationUrl}/sso`, {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(initialResponse.status).toBe(200)
  expect(await initialResponse.json()).toMatchObject({
    Data: null,
    Enabled: false,
    Identifier: null,
    object: "organizationSso",
    Urls: {
      CallbackPath: "https://vault.example/oidc-signin",
      SpAcsUrl: `https://vault.example/saml2/${organizationUuid}/Acs`,
    },
  })

  const saveResponse = await context.app.request(`${organizationUrl}/sso`, {
    body: JSON.stringify({
      data: { authority: "https://idp.example", clientId: "client", configType: 0 },
      enabled: true,
      identifier: "organization-sso",
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(saveResponse.status).toBe(200)
  expect(await saveResponse.json()).toMatchObject({
    Data: { Authority: "https://idp.example", ClientId: "client", ConfigType: 0 },
    Enabled: true,
    Identifier: "organization-sso",
    object: "organizationSso",
  })
  expect(context.database.query("SELECT org_uuid, enabled, data FROM organization_sso_configs").all()).toEqual([
    {
      org_uuid: organizationUuid,
      enabled: 1,
      data: JSON.stringify({ authority: "https://idp.example", clientId: "client", configType: 0 }),
    },
  ])
})

test("membership invite endpoint uses the organization admin guard and persists an invitation", async () => {
  const context = await contextCreate()
  const createResponse = await context.app.request("https://vault.example/api/organizations", {
    body: JSON.stringify({
      billingEmail: "billing@example.com",
      collectionName: "Initial Collection",
      key: "encrypted-owner-key",
      name: "Organization",
      planType: 6,
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)

  const unauthorizedResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/invite`,
    {
      body: JSON.stringify({ emails: ["invited@example.com"], groups: [], type: 2 }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  )
  expect(unauthorizedResponse.status).toBe(401)

  const inviteResponse = await context.app.request(
    `https://vault.example/api/organizations/${organizationUuid}/users/invite`,
    {
      body: JSON.stringify({ emails: ["invited@example.com"], groups: [], type: 2 }),
      headers: jsonHeaders(context.token),
      method: "POST",
    },
  )
  expect(inviteResponse.status).toBe(200)
  expect(await inviteResponse.text()).toBe("")
  expect(
    context.database
      .query("SELECT status, atype FROM users_organizations WHERE org_uuid = ? AND user_uuid != ?")
      .get(organizationUuid, userUuid),
  ).toEqual({
    status: organizationMembershipStatus.invited,
    atype: organizationMembershipType.user,
  })
})
