import { afterEach, expect, test } from "bun:test"
import type { Cipher } from "../../../src/server/contexts/ciphers/cipher.js"
import { cipherCollectionLinkSave } from "../../../src/server/contexts/ciphers/cipherCollectionLinkSave.js"
import { cipherCollectionsBulkUpdate } from "../../../src/server/contexts/ciphers/cipherCollectionsBulkUpdate.js"
import { cipherSave } from "../../../src/server/contexts/ciphers/cipherSave.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"

const date = "2026-08-28T00:00:00.000Z"
const ownerUuid = "00000000-0000-4000-8000-000000000701"
const memberUuid = "00000000-0000-4000-8000-000000000702"
const organizationUuid = "00000000-0000-4000-8000-000000000703"
const ownerMembershipUuid = "00000000-0000-4000-8000-000000000704"
const memberMembershipUuid = "00000000-0000-4000-8000-000000000705"
const firstCollectionUuid = "00000000-0000-4000-8000-000000000706"
const secondCollectionUuid = "00000000-0000-4000-8000-000000000707"
const firstCipherUuid = "00000000-0000-4000-8000-000000000708"
const secondCipherUuid = "00000000-0000-4000-8000-000000000709"
const otherOrganizationUuid = "00000000-0000-4000-8000-000000000710"
const otherCipherUuid = "00000000-0000-4000-8000-000000000711"
const databases: DatabaseConnection[] = []

function userSave(database: DatabaseConnection, uuid: string): void {
  database.run(
    `INSERT INTO users (
      uuid, created_at, updated_at, email, name, password_hash, salt,
      password_iterations, akey, security_stamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuid, date, date, `${uuid}@example.com`, uuid, new Uint8Array([1]), new Uint8Array([2]), 100_000, "akey", "stamp"],
  )
}

function cipherCreate(uuid: string, cipherOrganizationUuid = organizationUuid): Cipher {
  return {
    uuid,
    createdAt: date,
    updatedAt: date,
    userUuid: null,
    organizationUuid: cipherOrganizationUuid,
    key: "cipher-key",
    type: 1,
    name: uuid,
    notes: null,
    fields: null,
    data: "{}",
    passwordHistory: null,
    deletedAt: null,
    reprompt: null,
  }
}

function databaseCreate(): DatabaseConnection {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  userSave(database, ownerUuid)
  userSave(database, memberUuid)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Bulk organization",
    "bulk@example.com",
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
  for (const [uuid, name] of [
    [firstCollectionUuid, "First"],
    [secondCollectionUuid, "Second"],
  ] as const)
    database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [uuid, organizationUuid, name])
  for (const uuid of [firstCipherUuid, secondCipherUuid]) {
    const saveResult = cipherSave(database, cipherCreate(uuid))
    if (!saveResult.success) throw new Error(saveResult.errorMessage)
  }
  return database
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("bulk collection updates add and remove links without revisions", () => {
  const database = databaseCreate()
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    otherOrganizationUuid,
    "Other organization",
    "other@example.com",
  ])
  const otherCipherSaveResult = cipherSave(database, cipherCreate(otherCipherUuid, otherOrganizationUuid))
  if (!otherCipherSaveResult.success) throw new Error(otherCipherSaveResult.errorMessage)
  const added = cipherCollectionsBulkUpdate(
    database,
    ownerUuid,
    organizationUuid,
    [firstCipherUuid, secondCipherUuid, otherCipherUuid, "missing-cipher"],
    [firstCollectionUuid, secondCollectionUuid],
    false,
  )
  expect(added.success).toBe(true)
  expect(
    database
      .query("SELECT cipher_uuid, collection_uuid FROM ciphers_collections ORDER BY cipher_uuid, collection_uuid")
      .all(),
  ).toEqual([
    { cipher_uuid: firstCipherUuid, collection_uuid: firstCollectionUuid },
    { cipher_uuid: firstCipherUuid, collection_uuid: secondCollectionUuid },
    { cipher_uuid: secondCipherUuid, collection_uuid: firstCollectionUuid },
    { cipher_uuid: secondCipherUuid, collection_uuid: secondCollectionUuid },
  ])
  expect(database.query("SELECT updated_at FROM users WHERE uuid = ?").get(ownerUuid)).toEqual({ updated_at: date })

  const removed = cipherCollectionsBulkUpdate(
    database,
    ownerUuid,
    organizationUuid,
    [firstCipherUuid, secondCipherUuid],
    [firstCollectionUuid],
    true,
  )
  expect(removed.success).toBe(true)
  expect(
    database
      .query("SELECT cipher_uuid, collection_uuid FROM ciphers_collections ORDER BY cipher_uuid, collection_uuid")
      .all(),
  ).toEqual([
    { cipher_uuid: firstCipherUuid, collection_uuid: secondCollectionUuid },
    { cipher_uuid: secondCipherUuid, collection_uuid: secondCollectionUuid },
  ])
})

test("bulk collection updates require confirmed membership and writable collections", () => {
  const database = databaseCreate()
  const notMember = cipherCollectionsBulkUpdate(database, "missing-user", organizationUuid, [], [], false)
  expect(notMember).toMatchObject({ code: "platform.invalid-request", statusCode: 400 })

  const notWritable = cipherCollectionsBulkUpdate(
    database,
    memberUuid,
    organizationUuid,
    [firstCipherUuid],
    [firstCollectionUuid],
    false,
  )
  expect(notWritable).toMatchObject({ code: "platform.not-found", statusCode: 404 })
})

test("bulk collection updates ignore ciphers the member cannot write", () => {
  const database = databaseCreate()
  database.run("INSERT INTO users_collections (user_uuid, collection_uuid, read_only) VALUES (?, ?, ?)", [
    memberUuid,
    firstCollectionUuid,
    0,
  ])
  const initialLinkResult = cipherCollectionLinkSave(database, firstCipherUuid, firstCollectionUuid)
  if (!initialLinkResult.success) throw new Error(initialLinkResult.errorMessage)

  const result = cipherCollectionsBulkUpdate(
    database,
    memberUuid,
    organizationUuid,
    [firstCipherUuid, secondCipherUuid],
    [firstCollectionUuid],
    false,
  )
  expect(result.success).toBe(true)
  expect(database.query("SELECT cipher_uuid, collection_uuid FROM ciphers_collections").all()).toEqual([
    { cipher_uuid: firstCipherUuid, collection_uuid: firstCollectionUuid },
  ])
})
