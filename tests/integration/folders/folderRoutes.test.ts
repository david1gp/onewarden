import { afterEach, expect, test } from "bun:test"
import { folderCreate } from "../../../src/server/contexts/folders/folderCreate.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

function userCreate(uuid: string): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-28T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: `${uuid}@example.com`,
    emailNew: null,
    emailNewToken: null,
    name: uuid,
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 600_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
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

function deviceCreate(userUuid: string): IdentityDevice {
  return {
    uuid: "folder-device",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: "Folder Device",
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
  token: string
  notifications: unknown[]
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = userCreate("folder-user")
  const device = deviceCreate(user.uuid)
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clockTestCreate("2026-08-28T00:00:00.000Z"), false).success).toBe(true)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const bundleResult = await identityTokenBundleCreate(
    user,
    device,
    "folder-client",
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
    folders: {
      notification: {
        sendFolderUpdate: (notification) => {
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
      identifier: identifierTestCreate(["folder-one", "folder-two"]),
    },
  })
  return { app, database, notifications, token: bundleResult.data.accessToken }
}

function jsonHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("folder routes implement CRUD aliases, user scoping, ordering, revisions, and notifications", async () => {
  const context = await contextCreate()
  const url = "https://vault.example/api/folders"

  const createResponse = await context.app.request(url, {
    body: JSON.stringify({ id: "ignored-client-id", name: "First" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(createResponse.status).toBe(200)
  expect(await createResponse.json()).toEqual({
    id: "folder-one",
    name: "First",
    object: "folder",
    revisionDate: "2026-08-28T00:00:00.000Z",
  })

  const listResponse = await context.app.request(url, { headers: { authorization: `Bearer ${context.token}` } })
  expect(listResponse.status).toBe(200)
  expect(await listResponse.json()).toEqual({
    continuationToken: null,
    data: [{ id: "folder-one", name: "First", object: "folder", revisionDate: "2026-08-28T00:00:00.000Z" }],
    object: "list",
  })

  const getResponse = await context.app.request(`${url}/folder-one`, {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(await getResponse.json()).toEqual({
    id: "folder-one",
    name: "First",
    object: "folder",
    revisionDate: "2026-08-28T00:00:00.000Z",
  })

  const postUpdateResponse = await context.app.request(`${url}/folder-one`, {
    body: JSON.stringify({ name: "Renamed", id: "ignored-update-id" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(await postUpdateResponse.json()).toMatchObject({ id: "folder-one", name: "Renamed", object: "folder" })

  const putUpdateResponse = await context.app.request(`${url}/folder-one`, {
    body: JSON.stringify({ name: "Renamed again" }),
    headers: jsonHeaders(context.token),
    method: "PUT",
  })
  expect(await putUpdateResponse.json()).toMatchObject({ id: "folder-one", name: "Renamed again", object: "folder" })

  const deleteAliasResponse = await context.app.request(`${url}/folder-one/delete`, {
    headers: { authorization: `Bearer ${context.token}` },
    method: "POST",
  })
  expect(deleteAliasResponse.status).toBe(200)
  expect(await deleteAliasResponse.text()).toBe("")

  const secondCreateResponse = await context.app.request(url, {
    body: JSON.stringify({ name: "Second" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(await secondCreateResponse.json()).toMatchObject({ id: "folder-two", name: "Second" })
  const deleteResponse = await context.app.request(`${url}/folder-two`, {
    headers: { authorization: `Bearer ${context.token}` },
    method: "DELETE",
  })
  expect(deleteResponse.status).toBe(200)

  expect(context.notifications).toEqual([
    {
      contextId: "folder-device",
      payload: { Id: "folder-one", RevisionDate: "2026-08-28T00:00:00.000Z", UserId: "folder-user" },
      type: 7,
    },
    {
      contextId: "folder-device",
      payload: { Id: "folder-one", RevisionDate: "2026-08-28T00:00:00.000Z", UserId: "folder-user" },
      type: 8,
    },
    {
      contextId: "folder-device",
      payload: { Id: "folder-one", RevisionDate: "2026-08-28T00:00:00.000Z", UserId: "folder-user" },
      type: 8,
    },
    {
      contextId: "folder-device",
      payload: { Id: "folder-one", RevisionDate: "2026-08-28T00:00:00.000Z", UserId: "folder-user" },
      type: 3,
    },
    {
      contextId: "folder-device",
      payload: { Id: "folder-two", RevisionDate: "2026-08-28T00:00:00.000Z", UserId: "folder-user" },
      type: 7,
    },
    {
      contextId: "folder-device",
      payload: { Id: "folder-two", RevisionDate: "2026-08-28T00:00:00.000Z", UserId: "folder-user" },
      type: 3,
    },
  ])
})

test("folder routes hide nonexistent and foreign folders behind the upstream invalid-folder response", async () => {
  const context = await contextCreate()
  const foreignUser = userCreate("foreign-user")
  expect(identityUserSave(context.database, foreignUser).success).toBe(true)
  const foreignFolder = folderCreate(
    context.database,
    foreignUser.uuid,
    "Foreign",
    clockTestCreate("2026-08-28T00:00:00.000Z"),
    identifierTestCreate(["foreign-folder"]),
  )
  expect(foreignFolder.success).toBe(true)

  const response = await context.app.request("https://vault.example/api/folders/foreign-folder", {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({
    message: "Invalid folder",
    validationErrors: { "": ["Invalid folder"] },
    object: "error",
  })
})
