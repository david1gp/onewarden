import { afterEach, expect, test } from "bun:test"
import { organizationCreate } from "../../../src/server/contexts/organizations/organizationCreate.js"
import { organizationDelete } from "../../../src/server/contexts/organizations/organizationDelete.js"
import { organizationFindByUuid } from "../../../src/server/contexts/organizations/organizationFindByUuid.js"
import { organizationLeave } from "../../../src/server/contexts/organizations/organizationLeave.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import { organizationSave } from "../../../src/server/contexts/organizations/organizationSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const userUuid = "00000000-0000-4000-8000-000000000201"
const secondUserUuid = "00000000-0000-4000-8000-000000000202"
const organizationUuid = "00000000-0000-4000-8000-000000000203"
const membershipUuid = "00000000-0000-4000-8000-000000000204"
const collectionUuid = "00000000-0000-4000-8000-000000000205"
const secondMembershipUuid = "00000000-0000-4000-8000-000000000206"
const groupUuid = "00000000-0000-4000-8000-000000000207"
const cipherUuid = "00000000-0000-4000-8000-000000000208"
const apiKeyUuid = "00000000-0000-4000-8000-000000000209"
const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function userInsert(database: DatabaseConnection, uuid: string, updatedAt = "2026-08-28T00:00:00.000Z"): void {
  database.run(
    `INSERT INTO users (
       uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      "2026-08-27T00:00:00.000Z",
      updatedAt,
      `${uuid}@example.com`,
      "Organization user",
      new Uint8Array([1]),
      new Uint8Array([2]),
      100_000,
      "akey",
      `${uuid}-stamp`,
    ],
  )
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization creation persists the owner and initial collection atomically", () => {
  const database = databaseCreate()
  userInsert(database, userUuid)
  const result = organizationCreate(
    database,
    userUuid,
    {
      billingEmail: "Billing@Example.COM",
      collectionName: "Initial",
      key: "owner-key",
      keys: { encryptedPrivateKey: "private-key", publicKey: "public-key" },
      name: "Organization",
      planType: "4",
    },
    clockTestCreate("2026-08-28T00:00:01.000Z"),
    identifierTestCreate([organizationUuid, membershipUuid, collectionUuid]),
  )

  expect(result).toEqual({
    success: true,
    data: {
      uuid: organizationUuid,
      name: "Organization",
      billingEmail: "billing@example.com",
      privateKey: "private-key",
      publicKey: "public-key",
    },
  })
  expect(
    database
      .query("SELECT access_all, status, atype, akey FROM users_organizations WHERE uuid = ?")
      .get(membershipUuid),
  ).toEqual({
    access_all: 1,
    status: 2,
    atype: 0,
    akey: "owner-key",
  })
  expect(database.query("SELECT org_uuid, name FROM collections WHERE uuid = ?").get(collectionUuid)).toEqual({
    org_uuid: organizationUuid,
    name: "Initial",
  })
  expect(
    database
      .query<{ name: string }, []>("PRAGMA table_info(organizations)")
      .all()
      .some((column) => column.name === "plan_type"),
  ).toBe(false)
})

test("organization persistence revises members and deletion removes organization-owned dependents", () => {
  const database = databaseCreate()
  userInsert(database, userUuid)
  userInsert(database, secondUserUuid)
  const createResult = organizationCreate(
    database,
    userUuid,
    {
      billingEmail: "billing@example.com",
      collectionName: "Initial",
      key: "owner-key",
      name: "Organization",
      planType: "6",
    },
    clockTestCreate("2026-08-28T00:00:00.000Z"),
    identifierTestCreate([organizationUuid, membershipUuid, collectionUuid]),
  )
  expect(createResult.success).toBe(true)
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [secondMembershipUuid, secondUserUuid, organizationUuid, 0, "second-key", 2, 2],
  )
  database.run("INSERT INTO users_collections (user_uuid, collection_uuid) VALUES (?, ?)", [userUuid, collectionUuid])
  database.run(
    `INSERT INTO groups (uuid, organizations_uuid, name, creation_date, revision_date)
     VALUES (?, ?, ?, ?, ?)`,
    [groupUuid, organizationUuid, "Group", "2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z"],
  )
  database.run("INSERT INTO groups_users (groups_uuid, users_organizations_uuid) VALUES (?, ?)", [
    groupUuid,
    secondMembershipUuid,
  ])
  database.run("INSERT INTO collections_groups (collections_uuid, groups_uuid) VALUES (?, ?)", [
    collectionUuid,
    groupUuid,
  ])
  database.run("INSERT INTO folders (uuid, created_at, updated_at, user_uuid, name) VALUES (?, ?, ?, ?, ?)", [
    "00000000-0000-4000-8000-00000000020a",
    "2026-08-28T00:00:00.000Z",
    "2026-08-28T00:00:00.000Z",
    userUuid,
    "Folder",
  ])
  database.run(
    `INSERT INTO ciphers (
       uuid, created_at, updated_at, organization_uuid, atype, name, data
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cipherUuid, "2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z", organizationUuid, 1, "Cipher", "{}"],
  )
  database.run("INSERT INTO folders_ciphers (cipher_uuid, folder_uuid) VALUES (?, ?)", [
    cipherUuid,
    "00000000-0000-4000-8000-00000000020a",
  ])
  database.run("INSERT INTO attachments (id, cipher_uuid, file_name, file_size, akey) VALUES (?, ?, ?, ?, ?)", [
    "00000000-0000-4000-8000-00000000020b",
    cipherUuid,
    "file.txt",
    4,
    "attachment-key",
  ])
  database.run("INSERT INTO favorites (user_uuid, cipher_uuid) VALUES (?, ?)", [userUuid, cipherUuid])
  database.run("INSERT INTO archives (user_uuid, cipher_uuid, archived_at) VALUES (?, ?, ?)", [
    userUuid,
    cipherUuid,
    "2026-08-28T00:00:00.000Z",
  ])
  database.run(
    "INSERT INTO organization_api_key (uuid, org_uuid, atype, api_key, revision_date) VALUES (?, ?, ?, ?, ?)",
    [apiKeyUuid, organizationUuid, 0, "api-key", "2026-08-28T00:00:00.000Z"],
  )

  const saveResult = organizationSave(
    database,
    {
      uuid: organizationUuid,
      name: "Renamed",
      billingEmail: "renamed@example.com",
      privateKey: null,
      publicKey: null,
    },
    "2026-08-28T00:00:02.000Z",
  )
  expect(saveResult.success).toBe(true)
  expect(organizationFindByUuid(database, organizationUuid)).toMatchObject({
    success: true,
    data: { name: "Renamed", billingEmail: "renamed@example.com" },
  })
  expect(
    database.query("SELECT updated_at FROM users WHERE uuid IN (?, ?) ORDER BY uuid").all(userUuid, secondUserUuid),
  ).toEqual([{ updated_at: "2026-08-28T00:00:02.000Z" }, { updated_at: "2026-08-28T00:00:02.000Z" }])

  const deleteResult = organizationDelete(database, organizationUuid, "2026-08-28T00:00:03.000Z")
  expect(deleteResult).toEqual({ success: true, data: undefined })
  for (const table of [
    "organizations",
    "users_organizations",
    "collections",
    "groups",
    "ciphers",
    "folders_ciphers",
    "attachments",
    "favorites",
    "archives",
    "organization_api_key",
  ]) {
    expect(database.query(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({ count: 0 })
  }
  expect(database.query("SELECT COUNT(*) AS count FROM folders").get()).toEqual({ count: 1 })
  expect(
    database.query("SELECT updated_at FROM users WHERE uuid IN (?, ?) ORDER BY uuid").all(userUuid, secondUserUuid),
  ).toEqual([{ updated_at: "2026-08-28T00:00:03.000Z" }, { updated_at: "2026-08-28T00:00:03.000Z" }])
})

test("organization leave removes member access and preserves the owner", () => {
  const database = databaseCreate()
  userInsert(database, userUuid)
  userInsert(database, secondUserUuid)
  const createResult = organizationCreate(
    database,
    userUuid,
    {
      billingEmail: "billing@example.com",
      collectionName: "Initial",
      key: "owner-key",
      name: "Organization",
      planType: 6,
    },
    clockTestCreate("2026-08-28T00:00:00.000Z"),
    identifierTestCreate([organizationUuid, membershipUuid, collectionUuid]),
  )
  expect(createResult.success).toBe(true)
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      secondMembershipUuid,
      secondUserUuid,
      organizationUuid,
      0,
      "member-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.user,
    ],
  )
  database.run("INSERT INTO users_collections (user_uuid, collection_uuid) VALUES (?, ?)", [
    secondUserUuid,
    collectionUuid,
  ])
  database.run(
    `INSERT INTO groups (uuid, organizations_uuid, name, creation_date, revision_date)
     VALUES (?, ?, ?, ?, ?)`,
    [groupUuid, organizationUuid, "Group", "2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z"],
  )
  database.run("INSERT INTO groups_users (groups_uuid, users_organizations_uuid) VALUES (?, ?)", [
    groupUuid,
    secondMembershipUuid,
  ])

  const result = organizationLeave(
    database,
    {
      accessAll: false,
      akey: "member-key",
      externalId: null,
      invitedByEmail: null,
      organizationUuid,
      resetPasswordKey: null,
      status: organizationMembershipStatus.confirmed,
      type: organizationMembershipType.user,
      userUuid: secondUserUuid,
      uuid: secondMembershipUuid,
    },
    "2026-08-28T00:00:01.000Z",
  )
  expect(result).toEqual({ success: true, data: undefined })
  expect(
    database.query("SELECT COUNT(*) AS count FROM users_organizations WHERE uuid = ?").get(secondMembershipUuid),
  ).toEqual({
    count: 0,
  })
  expect(
    database.query("SELECT COUNT(*) AS count FROM users_collections WHERE user_uuid = ?").get(secondUserUuid),
  ).toEqual({
    count: 0,
  })
  expect(
    database
      .query("SELECT COUNT(*) AS count FROM groups_users WHERE users_organizations_uuid = ?")
      .get(secondMembershipUuid),
  ).toEqual({
    count: 0,
  })
  expect(database.query("SELECT updated_at FROM users WHERE uuid = ?").get(secondUserUuid)).toEqual({
    updated_at: "2026-08-28T00:00:01.000Z",
  })
})
