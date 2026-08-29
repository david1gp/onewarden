import { afterEach, expect, test } from "bun:test"
import { cipherFindByUuid } from "../../../src/server/contexts/ciphers/cipherFindByUuid.js"
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
import { identityTestDeviceCreate } from "../../helpers/identityTestDeviceCreate.js"
import { identityTestUserCreate } from "../../helpers/identityTestUserCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []
const date = "2026-08-28T00:00:00.000Z"

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
  notifications: unknown[]
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = identityTestUserCreate("cipher-user", { name: "cipher-user", passwordIterations: 600_000 })
  const device = identityTestDeviceCreate(user.uuid, {
    uuid: "cipher-device",
    name: "Cipher Device",
    pushUuid: null,
    pushToken: null,
  })
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clockTestCreate(date), false).success).toBe(true)
  const clock = clockTestCreate(date)
  const bundleResult = await identityTokenBundleCreate(
    user,
    device,
    "cipher-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )
  if (!bundleResult.success) throw new Error(bundleResult.errorMessage)
  const notifications: unknown[] = []
  const app = serverAppCreate({
    clock,
    database,
    ciphers: {
      notification: {
        sendCipherUpdate: (notification) => {
          notifications.push(notification)
        },
        sendUserUpdate: (notification) => {
          notifications.push(notification)
        },
      },
    },
    identity: {
      clock,
      config: identityConfigCreate(),
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      identifier: identifierTestCreate(["cipher-one", "cipher-two", "folder-one"]),
    },
  })
  return { app, database, notifications, token: bundleResult.data.accessToken }
}

function jsonHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" }
}

function loginData(name: string) {
  return {
    name,
    type: 1,
    key: "encrypted-key",
    login: { password: "encrypted-password", uris: [{ uri: "https://example.com" }] },
    notes: "encrypted-notes",
    fields: [{ name: "field", type: 0, value: "value" }],
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("cipher routes persist encrypted data, favorites, folders, archive, revisions, and notifications", async () => {
  const context = await contextCreate()
  const folderResponse = await context.app.request("https://vault.example/api/folders", {
    body: JSON.stringify({ name: "Work" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(folderResponse.status).toBe(200)
  const folder = await folderResponse.json()

  const createResponse = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify({ ...loginData("Example"), folderId: folder.id, favorite: true }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  const created = await createResponse.json()
  expect(created).toMatchObject({
    favorite: true,
    folderId: folder.id,
    id: "cipher-two",
    login: { password: "encrypted-password", uris: [{ uri: "https://example.com" }] },
    name: "Example",
    object: "cipherDetails",
  })
  expect(created.fields).toEqual([{ name: "field", type: 0, value: "value" }])

  const userRow = context.database
    .query<{ updated_at: string }, [string]>("SELECT updated_at FROM users WHERE uuid = ?")
    .get("cipher-user")
  expect(userRow?.updated_at).toBe(date)

  const staleResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two", {
    body: JSON.stringify({ ...loginData("Stale"), lastKnownRevisionDate: "2026-08-27T23:59:58.000Z" }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(staleResponse.status).toBe(400)
  expect((await staleResponse.json()).message).toContain("out of date")

  const partialResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/partial", {
    body: JSON.stringify({ favorite: false, folderId: null }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(partialResponse.status).toBe(200)
  expect(await partialResponse.json()).toMatchObject({ favorite: false, folderId: null })

  const archiveResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/archive", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "PUT",
  })
  expect(archiveResponse.status).toBe(200)
  expect((await archiveResponse.json()).archivedDate).toBe(date)

  const softDeleteResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/delete", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "PUT",
  })
  expect(softDeleteResponse.status).toBe(200)
  const deleted = cipherFindByUuid(context.database, "cipher-two")
  expect(deleted.success && deleted.data?.deletedAt).toBe(date)

  const restoreResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/restore", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "PUT",
  })
  expect(restoreResponse.status).toBe(200)
  expect((await restoreResponse.json()).deletedDate).toBeNull()

  const hardDeleteResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "DELETE",
  })
  expect(hardDeleteResponse.status).toBe(200)
  const removed = cipherFindByUuid(context.database, "cipher-two")
  expect(removed.success && removed.data).toBeNull()
  expect(
    context.notifications.filter((item) => typeof item === "object" && item !== null && "type" in item),
  ).toHaveLength(5)
})

test("cipher route aliases implement bulk delete, restore, and move", async () => {
  const context = await contextCreate()
  const first = await context.app.request("https://vault.example/api/ciphers/create", {
    body: JSON.stringify({ cipher: loginData("First") }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const second = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(loginData("Second")),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(first.status).toBe(200)
  expect(second.status).toBe(200)
  const folder = await context.app.request("https://vault.example/api/folders", {
    body: JSON.stringify({ name: "Bulk" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const folderData = await folder.json()
  const move = await context.app.request("https://vault.example/api/ciphers/move", {
    body: JSON.stringify({ folderId: folderData.id, ids: ["cipher-one", "cipher-two"] }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(move.status).toBe(200)

  const remove = await context.app.request("https://vault.example/api/ciphers/delete", {
    body: JSON.stringify({ ids: ["cipher-one", "cipher-two"] }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(remove.status).toBe(200)
  const restore = await context.app.request("https://vault.example/api/ciphers/restore", {
    body: JSON.stringify({ ids: ["cipher-one", "cipher-two"] }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(restore.status).toBe(200)
  expect((await restore.json()).data).toHaveLength(2)
})

test("cipher sharing and collection routes support organization ownership and all compatibility aliases", async () => {
  const context = await contextCreate()
  const organizationUuid = "00000000-0000-4000-8000-000000000601"
  const firstCollectionUuid = "00000000-0000-4000-8000-000000000602"
  const secondCollectionUuid = "00000000-0000-4000-8000-000000000603"
  context.database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Cipher Organization",
    "billing@example.com",
  ])
  context.database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      "00000000-0000-4000-8000-000000000604",
      "cipher-user",
      organizationUuid,
      1,
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  for (const [uuid, name] of [
    [firstCollectionUuid, "First"],
    [secondCollectionUuid, "Second"],
  ] as const)
    context.database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
      uuid,
      organizationUuid,
      name,
    ])

  const firstCipherResponse = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(loginData("Shared first")),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(firstCipherResponse.status).toBe(200)
  const firstCipher = (await firstCipherResponse.json()) as Record<string, unknown>
  const shareBody = {
    Cipher: { ...loginData("Shared first"), lastKnownRevisionDate: date, organizationId: organizationUuid },
    CollectionIds: [firstCollectionUuid],
  }
  const shareResponse = await context.app.request("https://vault.example/api/ciphers/cipher-one/share", {
    body: JSON.stringify(shareBody),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(shareResponse.status).toBe(200)
  expect(await shareResponse.json()).toMatchObject({
    collectionIds: [firstCollectionUuid],
    organizationId: organizationUuid,
  })
  expect(firstCipher.id).toBe("cipher-one")

  const plainReplace = await context.app.request("https://vault.example/api/ciphers/cipher-one/collections", {
    body: JSON.stringify({ CollectionIds: [secondCollectionUuid] }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(plainReplace.status).toBe(200)
  const wrappedRemove = await context.app.request("https://vault.example/api/ciphers/cipher-one/collections_v2", {
    body: JSON.stringify({ collectionIds: [] }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(wrappedRemove.status).toBe(200)
  expect(await wrappedRemove.json()).toMatchObject({ object: "optionalCipherDetails", cipher: { collectionIds: [] } })
  const adminPut = await context.app.request("https://vault.example/api/ciphers/cipher-one/collections-admin", {
    body: JSON.stringify({ collectionIds: [firstCollectionUuid] }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(adminPut.status).toBe(200)
  const adminPost = await context.app.request("https://vault.example/api/ciphers/cipher-one/collections-admin", {
    body: JSON.stringify({ collectionIds: [secondCollectionUuid] }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(adminPost.status).toBe(200)
  expect(
    context.database.query("SELECT collection_uuid FROM ciphers_collections WHERE cipher_uuid = ?").all("cipher-one"),
  ).toEqual([{ collection_uuid: secondCollectionUuid }])

  const secondCipherResponse = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(loginData("Shared second")),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(secondCipherResponse.status).toBe(200)
  const personalShareResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/share", {
    body: JSON.stringify({
      cipher: { ...loginData("Shared second"), organizationId: null },
      collectionIds: [firstCollectionUuid],
    }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(personalShareResponse.status).toBe(200)
  expect(context.notifications.at(-1)).toMatchObject({
    payload: { CollectionIds: [], Id: "cipher-two", OrganizationId: null, UserId: "cipher-user" },
    type: 1,
    userIds: ["cipher-user"],
  })
  const putShareResponse = await context.app.request("https://vault.example/api/ciphers/cipher-two/share", {
    body: JSON.stringify({
      cipher: { ...loginData("Shared second"), organizationId: organizationUuid },
      collectionIds: [],
    }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(putShareResponse.status).toBe(200)
  expect(context.database.query("SELECT organization_uuid FROM ciphers WHERE uuid = ?").get("cipher-two")).toEqual({
    organization_uuid: organizationUuid,
  })

  const createdOrganizationCipher = await context.app.request("https://vault.example/api/ciphers/create", {
    body: JSON.stringify({
      Cipher: { ...loginData("Created organization"), organizationId: organizationUuid },
      CollectionIds: [firstCollectionUuid],
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createdOrganizationCipher.status).toBe(200)
  expect(await createdOrganizationCipher.json()).toMatchObject({
    collectionIds: [firstCollectionUuid],
    organizationId: organizationUuid,
  })
  expect(
    context.database.query("SELECT collection_uuid FROM ciphers_collections WHERE cipher_uuid = ?").get("folder-one"),
  ).toEqual({ collection_uuid: firstCollectionUuid })
  expect(context.notifications.at(-1)).toMatchObject({
    payload: { CollectionIds: [firstCollectionUuid], Id: "folder-one", OrganizationId: organizationUuid },
    type: 1,
    userIds: ["cipher-user"],
  })
})

test("bulk cipher sharing is atomic and sends one vault sync notification", async () => {
  const context = await contextCreate()
  const organizationUuid = "00000000-0000-4000-8000-000000000611"
  const collectionUuid = "00000000-0000-4000-8000-000000000612"
  context.database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Bulk organization",
    "bulk@example.com",
  ])
  context.database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      "00000000-0000-4000-8000-000000000613",
      "cipher-user",
      organizationUuid,
      1,
      "bulk-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  context.database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    collectionUuid,
    organizationUuid,
    "Bulk collection",
  ])

  const first = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(loginData("Bulk first")),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const second = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(loginData("Bulk second")),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(first.status).toBe(200)
  expect(second.status).toBe(200)
  context.notifications.length = 0

  const shareBody = (id: string, name: string) => ({
    id,
    ...loginData(name),
    lastKnownRevisionDate: "invalid-but-ignored-by-bulk-share",
    organizationId: organizationUuid,
  })
  const response = await context.app.request("https://vault.example/api/ciphers/share", {
    body: JSON.stringify({
      ciphers: [shareBody("cipher-one", "Bulk first"), shareBody("cipher-two", "Bulk second")],
      collectionIds: [collectionUuid],
    }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("")
  expect(context.database.query("SELECT organization_uuid, user_uuid FROM ciphers ORDER BY uuid").all()).toEqual([
    { organization_uuid: organizationUuid, user_uuid: null },
    { organization_uuid: organizationUuid, user_uuid: null },
  ])
  expect(context.notifications).toEqual([
    {
      contextId: "cipher-device",
      payload: { Date: date, UserId: "cipher-user" },
      type: 4,
    },
  ])

  const before = context.database
    .query("SELECT organization_uuid, user_uuid FROM ciphers WHERE uuid = ?")
    .get("cipher-one")
  const failed = await context.app.request("https://vault.example/api/ciphers/share", {
    body: JSON.stringify({
      ciphers: [shareBody("missing-cipher", "Missing"), shareBody("cipher-one", "Bulk first")],
      collectionIds: [collectionUuid],
    }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(failed.status).toBe(400)
  expect(
    context.database.query("SELECT organization_uuid, user_uuid FROM ciphers WHERE uuid = ?").get("cipher-one"),
  ).toEqual(before)
})

test("bulk move includes accessible organization ciphers and notifies the requesting user", async () => {
  const context = await contextCreate()
  const organizationUuid = "00000000-0000-4000-8000-000000000621"
  const collectionUuid = "00000000-0000-4000-8000-000000000622"
  context.database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Move organization",
    "move@example.com",
  ])
  context.database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      "00000000-0000-4000-8000-000000000623",
      "cipher-user",
      organizationUuid,
      1,
      "move-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  context.database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    collectionUuid,
    organizationUuid,
    "Move collection",
  ])
  const create = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(loginData("Move shared")),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(create.status).toBe(200)
  const share = await context.app.request("https://vault.example/api/ciphers/cipher-one/share", {
    body: JSON.stringify({
      cipher: { ...loginData("Move shared"), organizationId: organizationUuid },
      collectionIds: [collectionUuid],
    }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(share.status).toBe(200)
  const folder = await context.app.request("https://vault.example/api/folders", {
    body: JSON.stringify({ name: "Move shared folder" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  const folderData = await folder.json()
  context.notifications.length = 0

  const move = await context.app.request("https://vault.example/api/ciphers/move", {
    body: JSON.stringify({ folderId: folderData.id, ids: ["cipher-one"] }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(move.status).toBe(200)
  expect(
    context.database.query("SELECT folder_uuid FROM folders_ciphers WHERE cipher_uuid = ?").get("cipher-one"),
  ).toEqual({ folder_uuid: folderData.id })
  expect(context.notifications).toMatchObject([
    {
      payload: { Id: "cipher-one", UserId: null },
      type: 0,
      userIds: ["cipher-user"],
    },
  ])

  context.notifications.length = 0
  const failedMove = await context.app.request("https://vault.example/api/ciphers/move", {
    body: JSON.stringify({ folderId: null, ids: ["cipher-one", "missing-cipher"] }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(failedMove.status).toBe(400)
  expect(await failedMove.json()).toMatchObject({
    message: "Not all ciphers are moved! 1 of the selected 2 were moved.",
  })
  expect(
    context.database.query("SELECT folder_uuid FROM folders_ciphers WHERE cipher_uuid = ?").get("cipher-one"),
  ).toEqual({ folder_uuid: folderData.id })
  expect(context.notifications).toEqual([])
})

test("personal cipher import maps folders, ignores client revisions, persists history, and sends one vault update", async () => {
  const context = await contextCreate()
  const response = await context.app.request("https://vault.example/api/ciphers/import", {
    body: JSON.stringify({
      ciphers: [
        {
          id: "client-cipher-id",
          type: 1,
          name: "Imported",
          organizationID: null,
          login: { password: "encrypted-password" },
          passwordHistory: [{ password: "old", lastUsedDate: "invalid" }],
          lastKnownRevisionDate: "2020-01-01T00:00:00.000Z",
        },
      ],
      folders: [{ id: "client-folder-id", name: "Imported folder" }],
      folderRelationships: [{ key: 0, value: 0 }],
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("")
  expect(
    context.database
      .query<{ updated_at: string }, [string]>("SELECT updated_at FROM users WHERE uuid = ?")
      .get("cipher-user")?.updated_at,
  ).toBe(date)

  const listResponse = await context.app.request("https://vault.example/api/ciphers", {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(await listResponse.json()).toMatchObject({
    data: [
      {
        folderId: "cipher-one",
        id: "cipher-two",
        name: "Imported",
        passwordHistory: [{ password: "old", lastUsedDate: "1970-01-01T00:00:00.000000Z" }],
      },
    ],
  })
  expect(context.notifications).toEqual([
    {
      contextId: "cipher-device",
      payload: { Date: date, UserId: "cipher-user" },
      type: 5,
    },
  ])
})

test("personal cipher import validates the complete batch before writing", async () => {
  const context = await contextCreate()
  const response = await context.app.request("https://vault.example/api/ciphers/import", {
    body: JSON.stringify({
      ciphers: [
        {
          type: 1,
          name: "Invalid",
          login: {},
          passwordHistory: [{ password: null }],
        },
      ],
      folders: [{ name: "Should not persist" }],
      folderRelationships: [{ key: 0, value: 0 }],
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({
    message: "The model state is invalid.",
    validationErrors: {
      "Ciphers[0].Notes": ["The password history contains a `null` value. Only strings are allowed."],
    },
    object: "error",
  })
  expect(context.database.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM folders").get()?.count).toBe(0)
  expect(context.database.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM ciphers").get()?.count).toBe(0)
  expect(context.notifications).toEqual([])
})

test("personal cipher import rejects notes over the default encrypted size limit", async () => {
  const context = await contextCreate()
  const response = await context.app.request("https://vault.example/api/ciphers/import", {
    body: JSON.stringify({
      ciphers: [{ type: 1, name: "Too large", login: {}, notes: "x".repeat(10_001) }],
      folders: [],
      folderRelationships: [],
    }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })

  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({
    message: "The model state is invalid.",
    validationErrors: {
      "Ciphers[0].Notes": ["The field Notes exceeds the maximum encrypted value length of 10000 characters."],
    },
  })
  expect(context.database.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM ciphers").get()?.count).toBe(0)
  expect(context.notifications).toEqual([])
})
