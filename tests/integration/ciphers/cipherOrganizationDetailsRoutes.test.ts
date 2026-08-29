import { afterEach, expect, test } from "bun:test"
import { cipherSave } from "../../../src/server/contexts/ciphers/cipherSave.js"
import type { Cipher } from "../../../src/server/contexts/ciphers/cipher.js"
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
import { identityTestDeviceCreate } from "../../helpers/identityTestDeviceCreate.js"
import { identityTestUserCreate } from "../../helpers/identityTestUserCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []
const userUuid = "organization-details-user"
const deviceUuid = "organization-details-device"
const organizationUuid = "00000000-0000-4000-8000-000000001001"
const otherOrganizationUuid = "00000000-0000-4000-8000-000000001002"
const membershipUuid = "00000000-0000-4000-8000-000000001003"
const collectionUuid = "00000000-0000-4000-8000-000000001004"
const otherCollectionUuid = "00000000-0000-4000-8000-000000001005"
const activeCipherUuid = "00000000-0000-4000-8000-000000001006"
const deletedCipherUuid = "00000000-0000-4000-8000-000000001007"
const invalidCipherUuid = "00000000-0000-4000-8000-000000001008"

async function contextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const config = identityConfigCreate({ PASSWORD_ITERATIONS: 600_000 })
  const user = identityTestUserCreate(userUuid, { name: "Organization Details User", passwordIterations: 600_000 })
  const device = identityTestDeviceCreate(user.uuid, {
    name: "Organization Details Device",
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
    "Details Organization",
    "details@example.com",
  ])
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    otherOrganizationUuid,
    "Other Organization",
    "other@example.com",
  ])
  database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      membershipUuid,
      userUuid,
      organizationUuid,
      0,
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    collectionUuid,
    organizationUuid,
    "Details Collection",
  ])
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    otherCollectionUuid,
    otherOrganizationUuid,
    "Other Collection",
  ])
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "organization-details-client",
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
      identity: {
        clock,
        config,
        database,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicOrigin: "https://vault.example",
      },
    }),
    database,
    token: tokenResult.data.accessToken,
  }
}

function cipherCreate(uuid: string, name: string, deletedAt: string | null = null, type = 1): Cipher {
  return {
    createdAt: "2026-08-27T00:00:00.000Z",
    data: JSON.stringify({ password: "encrypted-password", uris: [{ uri: "https://example.com" }] }),
    deletedAt,
    fields: JSON.stringify([{ name: "field", type: 0, value: "encrypted-value" }]),
    key: "encrypted-cipher-key",
    name,
    notes: "encrypted-notes",
    organizationUuid,
    passwordHistory: JSON.stringify([{ password: "old-password", lastUsedDate: "2026-08-27T00:00:00Z" }]),
    reprompt: 1,
    type,
    updatedAt: deletedAt ?? "2026-08-28T00:00:00.000Z",
    userUuid: null,
    uuid,
  }
}

function jsonHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}` }
}

async function errorRead(response: Response, status: number, message: string): Promise<void> {
  expect(response.status).toBe(status)
  expect(await response.json()).toMatchObject({
    errorModel: { message, object: "error" },
    message,
    object: "error",
    validationErrors: { "": [message] },
  })
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization details parses its query and returns upstream organization-sync serialization", async () => {
  const context = await contextCreate()
  const active = cipherCreate(activeCipherUuid, "Active Cipher")
  const deleted = cipherCreate(deletedCipherUuid, "Deleted Cipher", "2026-08-28T00:00:00.000Z")
  for (const cipher of [active, deleted]) {
    expect(cipherSave(context.database, cipher)).toEqual({ success: true, data: undefined })
    context.database.run("INSERT INTO ciphers_collections (cipher_uuid, collection_uuid) VALUES (?, ?)", [
      cipher.uuid,
      collectionUuid,
    ])
  }
  context.database.run("INSERT INTO ciphers_collections (cipher_uuid, collection_uuid) VALUES (?, ?)", [
    activeCipherUuid,
    otherCollectionUuid,
  ])

  const response = await context.app.request(
    `https://vault.example/api/ciphers/organization-details?organizationId=${organizationUuid}&unused=value`,
    { headers: jsonHeaders(context.token) },
  )
  expect(response.status).toBe(200)
  const body = (await response.json()) as { continuationToken: null; data: Record<string, unknown>[]; object: string }
  expect(body).toMatchObject({ continuationToken: null, object: "list" })
  expect(body.data.map((cipher) => cipher.id)).toEqual([activeCipherUuid, deletedCipherUuid])
  expect(body.data[0]).toMatchObject({
    collectionIds: [collectionUuid],
    creationDate: "2026-08-27T00:00:00.000000Z",
    deletedDate: null,
    id: activeCipherUuid,
    login: {
      password: "encrypted-password",
      uri: "https://example.com",
      uris: [{ uri: "https://example.com" }],
    },
    name: "Active Cipher",
    object: "cipherDetails",
    organizationId: organizationUuid,
    passwordHistory: [{ lastUsedDate: "2026-08-27T00:00:00.000000Z", password: "old-password" }],
    revisionDate: "2026-08-28T00:00:00.000000Z",
  })
  expect(body.data[1]).toMatchObject({ deletedDate: "2026-08-28T00:00:00.000000Z", id: deletedCipherUuid })
  for (const cipher of body.data) {
    for (const field of ["archivedDate", "edit", "favorite", "folderId", "permissions", "viewPassword"])
      expect(cipher).not.toHaveProperty(field)
  }
})

test("organization details enforces authentication, manager role, confirmation, and full access", async () => {
  const context = await contextCreate()
  const url = `https://vault.example/api/ciphers/organization-details?organizationId=${organizationUuid}`
  await errorRead(await context.app.request(url), 401, "No access token provided")

  context.database.run("UPDATE users_organizations SET atype = ?, access_all = ? WHERE uuid = ?", [
    organizationMembershipType.manager,
    0,
    membershipUuid,
  ])
  await errorRead(await context.app.request(url, { headers: jsonHeaders(context.token) }), 404, "Resource not found.")

  context.database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.user,
    membershipUuid,
  ])
  await errorRead(
    await context.app.request(url, { headers: jsonHeaders(context.token) }),
    401,
    "You need to be a Manager, Admin or Owner to call this endpoint",
  )

  context.database.run("UPDATE users_organizations SET atype = ?, status = ? WHERE uuid = ?", [
    organizationMembershipType.owner,
    organizationMembershipStatus.revoked,
    membershipUuid,
  ])
  await errorRead(
    await context.app.request(url, { headers: jsonHeaders(context.token) }),
    401,
    "User status is either revoked or invalid.",
  )
})

test("organization details rejects malformed, missing, and unknown organization query values", async () => {
  const context = await contextCreate()
  const headers = jsonHeaders(context.token)
  await errorRead(
    await context.app.request("https://vault.example/api/ciphers/organization-details", { headers }),
    401,
    "Error getting the organization id",
  )
  await errorRead(
    await context.app.request("https://vault.example/api/ciphers/organization-details?organizationId=invalid", {
      headers,
    }),
    401,
    "Error getting the organization id",
  )
  await errorRead(
    await context.app.request(
      "https://vault.example/api/ciphers/organization-details?organizationId=00000000-0000-4000-8000-000000001009",
      { headers },
    ),
    401,
    "The current user isn't member of the organization",
  )
})

test("organization details maps invalid serialized cipher data to a client error", async () => {
  const context = await contextCreate()
  expect(cipherSave(context.database, cipherCreate(invalidCipherUuid, "Invalid Cipher", null, 99))).toEqual({
    success: true,
    data: undefined,
  })
  const response = await context.app.request(
    `https://vault.example/api/ciphers/organization-details?organizationId=${organizationUuid}`,
    { headers: jsonHeaders(context.token) },
  )
  await errorRead(response, 400, `Cipher ${invalidCipherUuid} has an invalid type 99`)
})
