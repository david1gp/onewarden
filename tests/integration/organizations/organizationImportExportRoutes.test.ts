import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { organizationApiClientCreate } from "../../../src/web/organizations/api/organizationApiClientCreate.js"
import { bitwardenOrganizationCsvExportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationCsvExportExecute.js"
import { bitwardenOrganizationCsvImportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationCsvImportExecute.js"
import { bitwardenOrganizationCsvLossyWarning } from "../../../src/web/organizations/model/bitwardenOrganizationCsvLossyWarning.js"
import { bitwardenOrganizationCsvParse } from "../../../src/web/organizations/model/bitwardenOrganizationCsvParse.js"
import { bitwardenOrganizationJsonExportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationJsonExportExecute.js"
import { bitwardenOrganizationJsonImportExecute } from "../../../src/web/organizations/model/bitwardenOrganizationJsonImportExecute.js"
import organizationFixture from "../../fixtures/bitwardenOrganizationJsonTask8.json"
import { identityTestDeviceCreate } from "../../helpers/identityTestDeviceCreate.js"
import { identityTestUserCreate } from "../../helpers/identityTestUserCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const userUuid = "00000000-0000-4000-8000-000000000801"
const deviceUuid = "00000000-0000-4000-8000-000000000802"
const organizationUuid = "00000000-0000-4000-8000-000000000803"
const foreignOrganizationUuid = "00000000-0000-4000-8000-000000000804"
const membershipUuid = "00000000-0000-4000-8000-000000000805"
const collectionUuid = "00000000-0000-4000-8000-000000000806"
const foreignCollectionUuid = "00000000-0000-4000-8000-000000000807"
const rollbackCollectionUuid = "00000000-0000-4000-8000-000000000808"
const foreignCipherUuid = "00000000-0000-4000-8000-000000000809"
const deletedCipherUuid = "00000000-0000-4000-8000-000000000810"
const foreignMembershipUuid = "00000000-0000-4000-8000-000000000811"
const existingDestinationCipherUuid = "00000000-0000-4000-8000-000000000812"
const databases: DatabaseConnection[] = []

function task11IdentifierValuesCreate(): string[] {
  return Array.from({ length: 40 }, (_, index) => `00000000-0000-4000-8000-${String(900 + index).padStart(12, "0")}`)
}

async function contextCreate(identifierValues = [rollbackCollectionUuid]): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const config = identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 })
  const user = identityTestUserCreate(userUuid, { name: "Organization Import User", passwordIterations: 100_000 })
  const device = identityTestDeviceCreate(userUuid, {
    name: "Organization Import Device",
    pushToken: null,
    pushUuid: null,
    uuid: deviceUuid,
  })
  const userResult = identityUserSave(database, user)
  if (!userResult.success) throw new Error(userResult.errorMessage)
  const deviceResult = identityDeviceSave(database, device, clock, false)
  if (!deviceResult.success) throw new Error(deviceResult.errorMessage)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Import Organization",
    "import@example.com",
  ])
  database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      membershipUuid,
      userUuid,
      organizationUuid,
      1,
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    collectionUuid,
    organizationUuid,
    "Writable Collection",
  ])
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "organization-import-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    config,
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  return {
    app: serverAppCreate({
      clock,
      database,
      identifier: identifierTestCreate(identifierValues),
      identity: {
        clock,
        config,
        database,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicOrigin: "https://vault.example",
        rateLimiter: { check: () => resultCreate(undefined) },
      },
    }),
    database,
    token: tokenResult.data.accessToken,
  }
}

function jsonHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-request-id": "organization-import-test",
  }
}

function organizationSessionCreate(accessToken: string): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      accessToken,
      email: `${userUuid}@example.com`,
      encryptedUserKey: "encrypted-user-key",
      expiresAt: Date.now() + 60_000,
      kdf: 0,
      kdfIterations: 100_000,
      kdfMemory: null,
      kdfParallelism: null,
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      userId: userUuid,
    }),
  } as ReturnType<typeof webAuthSessionCreate>
}

function cipherDataCreate(name: string, organizationId = organizationUuid): Record<string, unknown> {
  return {
    fields: [],
    favorite: false,
    id: null,
    key: null,
    login: { password: "encrypted-password" },
    name,
    notes: null,
    organizationId,
    passwordHistory: [],
    reprompt: 0,
    type: 1,
  }
}

function importBodyCreate(
  collectionId: string | null | undefined,
  cipher = cipherDataCreate("Imported Cipher"),
): Record<string, unknown> {
  const hasCollection = collectionId !== undefined
  return {
    ciphers: [cipher],
    collections: hasCollection
      ? [{ externalId: null, groups: [], id: collectionId, name: "Imported Collection", users: [] }]
      : [],
    collectionRelationships: hasCollection ? [{ key: 0, value: 0 }] : [],
  }
}

async function organizationImportRequest(
  context: Awaited<ReturnType<typeof contextCreate>>,
  body: Record<string, unknown>,
  requestedOrganizationUuid = organizationUuid,
): Promise<Response> {
  return context.app.request(
    `https://vault.example/api/ciphers/import-organization?organizationId=${requestedOrganizationUuid}`,
    { body: JSON.stringify(body), headers: jsonHeaders(context.token), method: "POST" },
  )
}

function foreignOrganizationCreate(database: DatabaseConnection): void {
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    foreignOrganizationUuid,
    "Foreign Organization",
    "foreign@example.com",
  ])
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    foreignCollectionUuid,
    foreignOrganizationUuid,
    "Foreign Collection",
  ])
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization export requires an admin and remains organization-scoped", async () => {
  const context = await contextCreate()
  foreignOrganizationCreate(context.database)
  context.database.run(
    "INSERT INTO ciphers (uuid, created_at, updated_at, organization_uuid, atype, name, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      foreignCipherUuid,
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      foreignOrganizationUuid,
      1,
      "Foreign Cipher",
      JSON.stringify({ Password: "foreign-password" }),
    ],
  )
  context.database.run(
    "INSERT INTO ciphers (uuid, created_at, updated_at, organization_uuid, atype, name, data, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      deletedCipherUuid,
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      organizationUuid,
      1,
      "Deleted Cipher",
      JSON.stringify({ Password: "deleted-password" }),
      "2026-08-28T01:00:00.000Z",
    ],
  )
  const exportUrl = `https://vault.example/api/organizations/${organizationUuid}/export`
  const ownerResponse = await context.app.request(exportUrl, { headers: jsonHeaders(context.token) })
  expect(ownerResponse.status).toBe(200)
  expect(await ownerResponse.json()).toMatchObject({
    collections: [{ id: collectionUuid }],
    ciphers: [],
  })

  context.database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.manager,
    membershipUuid,
  ])
  expect((await context.app.request(exportUrl, { headers: jsonHeaders(context.token) })).status).toBe(401)

  context.database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.admin,
    membershipUuid,
  ])
  expect((await context.app.request(exportUrl, { headers: jsonHeaders(context.token) })).status).toBe(200)
  expect(
    (
      await context.app.request(`https://vault.example/api/organizations/${foreignOrganizationUuid}/export`, {
        headers: jsonHeaders(context.token),
      })
    ).status,
  ).toBe(401)
})

test("organization imports require confirmed membership and allow only restricted writable collection reuse", async () => {
  const context = await contextCreate()
  context.database.run("UPDATE users_organizations SET atype = ?, access_all = 0 WHERE uuid = ?", [
    organizationMembershipType.manager,
    membershipUuid,
  ])
  context.database.run(
    "INSERT INTO users_collections (user_uuid, collection_uuid, read_only, hide_passwords, manage) VALUES (?, ?, ?, ?, ?)",
    [userUuid, collectionUuid, 0, 0, 1],
  )

  const writableReuseResponse = await organizationImportRequest(context, importBodyCreate(collectionUuid))
  expect(writableReuseResponse.status).toBe(200)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 1 })
  expect(
    context.database
      .query("SELECT COUNT(*) AS count FROM ciphers_collections WHERE collection_uuid = ?")
      .get(collectionUuid),
  ).toEqual({ count: 1 })

  const deletedImportResponse = await organizationImportRequest(
    context,
    importBodyCreate(collectionUuid, {
      ...cipherDataCreate("Deleted Import"),
      deletedDate: "2026-08-28T01:00:00.000Z",
    }),
  )
  expect(deletedImportResponse.status).toBe(400)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 1 })

  context.database.run("UPDATE users_collections SET read_only = 1 WHERE user_uuid = ? AND collection_uuid = ?", [
    userUuid,
    collectionUuid,
  ])
  const readOnlyReuseResponse = await organizationImportRequest(context, importBodyCreate(collectionUuid))
  expect(readOnlyReuseResponse.status).toBe(400)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 1 })

  const createCollectionResponse = await organizationImportRequest(context, importBodyCreate(null))
  expect(createCollectionResponse.status).toBe(400)
  const unknownCollectionResponse = await organizationImportRequest(
    context,
    importBodyCreate("00000000-0000-4000-8000-000000000899"),
  )
  expect(unknownCollectionResponse.status).toBe(400)
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM collections WHERE org_uuid = ?").get(organizationUuid),
  ).toEqual({ count: 1 })

  context.database.run("UPDATE users_organizations SET status = ? WHERE uuid = ?", [
    organizationMembershipStatus.accepted,
    membershipUuid,
  ])
  const unconfirmedResponse = await organizationImportRequest(context, {
    ciphers: [],
    collections: [],
    collectionRelationships: [],
  })
  expect(unconfirmedResponse.status).toBe(400)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 1 })
})

test("organization imports authorize every restricted cipher collection relationship", async () => {
  const context = await contextCreate()
  context.database.run("UPDATE users_organizations SET atype = ?, access_all = 0 WHERE uuid = ?", [
    organizationMembershipType.manager,
    membershipUuid,
  ])
  context.database.run(
    "INSERT INTO users_collections (user_uuid, collection_uuid, read_only, hide_passwords, manage) VALUES (?, ?, ?, ?, ?)",
    [userUuid, collectionUuid, 0, 0, 1],
  )

  const response = await organizationImportRequest(context, {
    ciphers: [cipherDataCreate("Assigned Cipher"), cipherDataCreate("Unassigned Cipher")],
    collections: [{ externalId: null, groups: [], id: collectionUuid, name: "Target Collection", users: [] }],
    collectionRelationships: [{ key: 0, value: 0 }],
  })

  expect(response.status).toBe(400)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 0 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers_collections").get()).toEqual({ count: 0 })
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM collections WHERE org_uuid = ?").get(organizationUuid),
  ).toEqual({ count: 1 })
  expect(context.database.query("SELECT updated_at FROM users WHERE uuid = ?").get(userUuid)).toEqual({
    updated_at: "2026-08-28T00:00:00.000Z",
  })

  context.database.run("UPDATE users_organizations SET atype = ?, access_all = 1 WHERE uuid = ?", [
    organizationMembershipType.owner,
    membershipUuid,
  ])
  const fullAccessResponse = await organizationImportRequest(context, {
    ciphers: [cipherDataCreate("Direct Full Access Cipher")],
    collections: [],
    collectionRelationships: [],
  })

  expect(fullAccessResponse.status).toBe(200)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 1 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers_collections").get()).toEqual({ count: 0 })
})

test("organization imports remap a consistent foreign source and reject malformed or mixed relationships", async () => {
  const context = await contextCreate()
  foreignOrganizationCreate(context.database)
  const foreignCipherResponse = await organizationImportRequest(
    context,
    importBodyCreate(undefined, cipherDataCreate("Foreign Cipher", foreignOrganizationUuid)),
  )
  expect(foreignCipherResponse.status).toBe(200)
  expect(context.database.query("SELECT organization_uuid FROM ciphers").all()).toEqual([
    { organization_uuid: organizationUuid },
  ])

  const foreignCollectionResponse = await organizationImportRequest(context, importBodyCreate(foreignCollectionUuid))
  expect(foreignCollectionResponse.status).toBe(400)

  const duplicateCollectionResponse = await organizationImportRequest(context, {
    ciphers: [cipherDataCreate("Duplicate Collection")],
    collections: [
      { externalId: null, groups: [], id: collectionUuid, name: "Target Collection", users: [] },
      { externalId: null, groups: [], id: collectionUuid, name: "Target Collection", users: [] },
    ],
    collectionRelationships: [
      { key: 0, value: 0 },
      { key: 0, value: 1 },
    ],
  })
  expect(duplicateCollectionResponse.status).toBe(400)

  const duplicateRelationshipResponse = await organizationImportRequest(context, {
    ciphers: [cipherDataCreate("Duplicate Relationship")],
    collections: [{ externalId: null, groups: [], id: collectionUuid, name: "Target Collection", users: [] }],
    collectionRelationships: [
      { key: 0, value: 0 },
      { key: 0, value: 0 },
    ],
  })
  expect(duplicateRelationshipResponse.status).toBe(400)

  const mixedSourceResponse = await organizationImportRequest(context, {
    ciphers: [
      cipherDataCreate("Source One", "source-organization-one"),
      cipherDataCreate("Source Two", "source-organization-two"),
    ],
    collections: [],
    collectionRelationships: [],
  })
  expect(mixedSourceResponse.status).toBe(400)

  const outOfBoundsRelationshipResponse = await organizationImportRequest(context, {
    ciphers: [cipherDataCreate("Out of Bounds Relationship")],
    collections: [{ externalId: null, groups: [], id: collectionUuid, name: "Target Collection", users: [] }],
    collectionRelationships: [{ key: 0, value: 1 }],
  })
  expect(outOfBoundsRelationshipResponse.status).toBe(400)

  const malformedRelationshipResponse = await organizationImportRequest(context, {
    ciphers: [cipherDataCreate("Malformed Relationship")],
    collections: [{ externalId: null, groups: [], id: collectionUuid, name: "Target Collection", users: [] }],
    collectionRelationships: [{ key: -1, value: 0 }],
  })
  expect(malformedRelationshipResponse.status).toBe(400)
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 1 })
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM collections WHERE org_uuid = ?").get(organizationUuid),
  ).toEqual({ count: 1 })
})

test("organization import rolls back collections, ciphers, links, and revisions after a later failure", async () => {
  const context = await contextCreate()
  context.database.run(
    "CREATE TRIGGER organization_import_rollback_failure BEFORE INSERT ON ciphers WHEN NEW.name = 'rollback-failure' BEGIN SELECT RAISE(ABORT, 'forced failure'); END",
  )
  const response = await organizationImportRequest(context, {
    ciphers: [cipherDataCreate("successful-first-cipher"), cipherDataCreate("rollback-failure")],
    collections: [{ externalId: null, groups: [], id: null, name: "Rollback Collection", users: [] }],
    collectionRelationships: [
      { key: 0, value: 0 },
      { key: 1, value: 0 },
    ],
  })
  expect(response.status).toBe(500)
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM collections WHERE org_uuid = ?").get(organizationUuid),
  ).toEqual({ count: 1 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 0 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM ciphers_collections").get()).toEqual({ count: 0 })
  expect(context.database.query("SELECT updated_at FROM users WHERE uuid = ?").get(userUuid)).toEqual({
    updated_at: "2026-08-28T00:00:00.000Z",
  })
})

test("organization JSON and lossy CSV adapters round-trip through real cross-organization routes", async () => {
  const context = await contextCreate(task11IdentifierValuesCreate())
  foreignOrganizationCreate(context.database)
  context.database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      foreignMembershipUuid,
      userUuid,
      foreignOrganizationUuid,
      1,
      "foreign-organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )

  const sourceKey = new Uint8Array(64).fill(3)
  const destinationKey = new Uint8Array(64).fill(4)
  context.database.run(
    "INSERT INTO ciphers (uuid, created_at, updated_at, organization_uuid, atype, name, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      existingDestinationCipherUuid,
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      organizationUuid,
      1,
      "Existing Destination Cipher",
      "{}",
    ],
  )
  const session = organizationSessionCreate(context.token)
  const apiClient = organizationApiClientCreate({
    baseUrl: "https://vault.example",
    fetchFn: (input, init) => context.app.request(String(input), init),
    token: () => context.token,
  })

  const sourceImport = await bitwardenOrganizationJsonImportExecute({
    apiClient,
    organizationId: foreignOrganizationUuid,
    organizationKey: sourceKey,
    rawContent: JSON.stringify(organizationFixture),
    session,
  })
  expect(sourceImport).toMatchObject({ success: true, data: { cipherCount: 4, collectionCount: 2, warnings: [] } })

  const sourceExport = await bitwardenOrganizationJsonExportExecute({
    apiClient,
    organizationId: foreignOrganizationUuid,
    organizationKey: sourceKey,
    session,
  })
  expect(sourceExport.success).toBe(true)
  if (!sourceExport.success) return
  const sourcePayload = JSON.parse(sourceExport.data.content) as {
    collections: Array<{ id: string; name: string; organizationId: string }>
    encrypted: boolean
    items: Array<{ collectionIds: string[]; name: string; organizationId: string }>
  }
  expect(sourcePayload.encrypted).toBe(false)
  expect(sourcePayload.items.map((item) => item.name)).toEqual([
    "Example Organization Login",
    "Example Organization Note",
    "Example Organization Card",
    "Example Organization Identity",
  ])
  expect(sourcePayload.items.every((item) => item.organizationId === foreignOrganizationUuid)).toBe(true)
  const sourceCollectionIds = new Map(sourcePayload.collections.map((collection) => [collection.name, collection.id]))
  const sourceEngineeringId = sourceCollectionIds.get("Engineering")
  const sourceSharedId = sourceCollectionIds.get("Shared")
  expect(sourceEngineeringId).toBeDefined()
  expect(sourceSharedId).toBeDefined()
  if (sourceEngineeringId === undefined || sourceSharedId === undefined) return
  expect(sourcePayload.items.map((item) => item.collectionIds)).toEqual([
    [sourceEngineeringId, sourceSharedId],
    [sourceSharedId],
    [sourceEngineeringId],
    [sourceEngineeringId],
  ])

  context.database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.manager,
    foreignMembershipUuid,
  ])
  const sourceExportDenied = await bitwardenOrganizationJsonExportExecute({
    apiClient,
    organizationId: foreignOrganizationUuid,
    organizationKey: sourceKey,
    session,
  })
  expect(sourceExportDenied.success).toBe(false)
  context.database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.owner,
    foreignMembershipUuid,
  ])

  const destinationImport = await bitwardenOrganizationJsonImportExecute({
    apiClient,
    organizationId: organizationUuid,
    organizationKey: destinationKey,
    rawContent: sourceExport.data.content,
    session,
  })
  expect(destinationImport).toMatchObject({
    success: true,
    data: { cipherCount: 4, collectionCount: 3, warnings: [] },
  })
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM ciphers WHERE organization_uuid = ?").get(organizationUuid),
  ).toEqual({ count: 5 })
  expect(
    context.database
      .query(
        "SELECT COUNT(*) AS count FROM ciphers_collections AS links INNER JOIN ciphers ON ciphers.uuid = links.cipher_uuid WHERE ciphers.organization_uuid = ?",
      )
      .get(organizationUuid),
  ).toEqual({ count: 5 })
  const destinationCollections = context.database
    .query<{ name: string; uuid: string }, [string]>(
      "SELECT name, uuid FROM collections WHERE org_uuid = ? ORDER BY uuid",
    )
    .all(organizationUuid)
  const destinationCollectionIds = new Map(
    destinationCollections.map((collection) => [collection.name, collection.uuid]),
  )
  const destinationEngineeringId = destinationCollectionIds.get("Engineering")
  const destinationSharedId = destinationCollectionIds.get("Shared")
  expect(destinationEngineeringId).toBeDefined()
  expect(destinationSharedId).toBeDefined()
  if (destinationEngineeringId === undefined || destinationSharedId === undefined) return
  expect(destinationEngineeringId).not.toBe(sourceEngineeringId)
  expect(destinationSharedId).not.toBe(sourceSharedId)
  expect(
    context.database
      .query(
        "SELECT collection_uuid, COUNT(*) AS count FROM ciphers_collections AS links INNER JOIN ciphers ON ciphers.uuid = links.cipher_uuid WHERE ciphers.organization_uuid = ? GROUP BY collection_uuid ORDER BY collection_uuid",
      )
      .all(organizationUuid),
  ).toEqual([
    { collection_uuid: destinationEngineeringId, count: 3 },
    { collection_uuid: destinationSharedId, count: 2 },
  ])

  context.database.run("UPDATE users_organizations SET atype = ?, access_all = 0 WHERE uuid = ?", [
    organizationMembershipType.manager,
    membershipUuid,
  ])
  const destinationCipherCount = context.database
    .query("SELECT COUNT(*) AS count FROM ciphers WHERE organization_uuid = ?")
    .get(organizationUuid)
  const destinationCollectionCount = context.database
    .query("SELECT COUNT(*) AS count FROM collections WHERE org_uuid = ?")
    .get(organizationUuid)
  const destinationImportDenied = await bitwardenOrganizationJsonImportExecute({
    apiClient,
    organizationId: organizationUuid,
    organizationKey: destinationKey,
    rawContent: sourceExport.data.content,
    session,
  })
  expect(destinationImportDenied.success).toBe(false)
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM ciphers WHERE organization_uuid = ?").get(organizationUuid),
  ).toEqual(destinationCipherCount)
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM collections WHERE org_uuid = ?").get(organizationUuid),
  ).toEqual(destinationCollectionCount)
  context.database.run("UPDATE users_organizations SET atype = ?, access_all = 1 WHERE uuid = ?", [
    organizationMembershipType.owner,
    membershipUuid,
  ])

  const csvExport = await bitwardenOrganizationCsvExportExecute({
    apiClient,
    organizationId: foreignOrganizationUuid,
    organizationKey: sourceKey,
    session,
  })
  expect(csvExport).toMatchObject({
    success: true,
    data: { cipherCount: 2, collectionCount: 2, skippedCipherCount: 2 },
  })
  if (!csvExport.success) return
  expect(csvExport.data.warnings[0]).toBe(bitwardenOrganizationCsvLossyWarning)
  const csvPayload = bitwardenOrganizationCsvParse(csvExport.data.content)
  expect(csvPayload).toMatchObject({ success: true })
  if (!csvPayload.success) return
  expect(csvPayload.data.map((record) => record.name)).toEqual([
    "Example Organization Login",
    "Example Organization Note",
  ])
  expect(csvPayload.data.every((record) => record.type === "login" || record.type === "note")).toBe(true)

  const csvImport = await bitwardenOrganizationCsvImportExecute({
    apiClient,
    organizationId: organizationUuid,
    organizationKey: destinationKey,
    rawContent: csvExport.data.content,
    session,
  })
  expect(csvImport).toMatchObject({
    success: true,
    data: { cipherCount: 2, collectionCount: 2, warnings: [bitwardenOrganizationCsvLossyWarning] },
  })
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM ciphers WHERE organization_uuid = ?").get(organizationUuid),
  ).toEqual({ count: 7 })
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM collections WHERE org_uuid = ?").get(organizationUuid),
  ).toEqual({ count: 6 })
  expect(
    context.database
      .query(
        "SELECT COUNT(*) AS count FROM ciphers_collections AS links INNER JOIN ciphers ON ciphers.uuid = links.cipher_uuid WHERE ciphers.organization_uuid = ?",
      )
      .get(organizationUuid),
  ).toEqual({ count: 8 })
})
