import { afterEach, expect, test } from "bun:test"
import { organizationCollectionAccessFindByUser } from "../../../src/server/contexts/organizations/organizationCollectionAccessFindByUser.js"
import { organizationCollectionAssignmentsReplace } from "../../../src/server/contexts/organizations/organizationCollectionAssignmentsReplace.js"
import { organizationCollectionFindByUser } from "../../../src/server/contexts/organizations/organizationCollectionFindByUser.js"
import { organizationCollectionGroupAccessFindByCollection } from "../../../src/server/contexts/organizations/organizationCollectionGroupAccessFindByCollection.js"
import { organizationCollectionUserAccessFindByCollection } from "../../../src/server/contexts/organizations/organizationCollectionUserAccessFindByCollection.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"

const ownerUuid = "00000000-0000-4000-8000-000000000301"
const memberUuid = "00000000-0000-4000-8000-000000000302"
const organizationUuid = "00000000-0000-4000-8000-000000000303"
const ownerMembershipUuid = "00000000-0000-4000-8000-000000000304"
const memberMembershipUuid = "00000000-0000-4000-8000-000000000305"
const collectionUuid = "00000000-0000-4000-8000-000000000306"
const groupUuid = "00000000-0000-4000-8000-000000000307"
const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  const database = result.data
  databases.push(database)
  for (const { email, userUuid } of [
    { email: "owner@example.com", userUuid: ownerUuid },
    { email: "member@example.com", userUuid: memberUuid },
  ]) {
    database.run(
      `INSERT INTO users (
         uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userUuid,
        "2026-08-28T00:00:00.000Z",
        "2026-08-28T00:00:00.000Z",
        email,
        "Collection user",
        new Uint8Array([1]),
        new Uint8Array([2]),
        100_000,
        "akey",
        `${userUuid}-stamp`,
      ],
    )
  }
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Organization",
    "billing@example.com",
  ])
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ownerMembershipUuid, ownerUuid, organizationUuid, 1, "owner-key", 2, 0],
  )
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [memberMembershipUuid, memberUuid, organizationUuid, 0, "member-key", 2, 2],
  )
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    collectionUuid,
    organizationUuid,
    "Collection",
  ])
  database.run(
    `INSERT INTO groups (uuid, organizations_uuid, name, access_all, creation_date, revision_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [groupUuid, organizationUuid, "Group", 0, "2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z"],
  )
  database.run("INSERT INTO groups_users (groups_uuid, users_organizations_uuid) VALUES (?, ?)", [
    groupUuid,
    memberMembershipUuid,
  ])
  return database
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("collection assignments resolve membership ids, group access, and affected-user revisions", () => {
  const database = databaseCreate()
  const result = organizationCollectionAssignmentsReplace(
    database,
    organizationUuid,
    collectionUuid,
    [{ id: groupUuid, hidePasswords: true, manage: false, readOnly: true }],
    [{ id: memberMembershipUuid, hidePasswords: false, manage: true, readOnly: false }],
    "2026-08-28T00:00:01.000Z",
  )

  expect(result).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT user_uuid, read_only, hide_passwords, manage FROM users_collections").all()).toEqual([
    { user_uuid: memberUuid, read_only: 0, hide_passwords: 0, manage: 1 },
  ])
  expect(
    database
      .query("SELECT collections_uuid, groups_uuid, read_only, hide_passwords, manage FROM collections_groups")
      .all(),
  ).toEqual([{ collections_uuid: collectionUuid, groups_uuid: groupUuid, read_only: 1, hide_passwords: 1, manage: 0 }])
  expect(
    database.query("SELECT updated_at FROM users WHERE uuid IN (?, ?) ORDER BY uuid").all(ownerUuid, memberUuid),
  ).toEqual([{ updated_at: "2026-08-28T00:00:01.000Z" }, { updated_at: "2026-08-28T00:00:01.000Z" }])
  expect(organizationCollectionFindByUser(database, memberUuid, true)).toMatchObject({
    success: true,
    data: [{ uuid: collectionUuid }],
  })
  expect(organizationCollectionAccessFindByUser(database, collectionUuid, memberUuid, true)).toEqual({
    success: true,
    data: { hidePasswords: false, manage: true, readOnly: false },
  })
  expect(organizationCollectionUserAccessFindByCollection(database, organizationUuid, collectionUuid)).toMatchObject({
    success: true,
    data: [{ membershipUuid: memberMembershipUuid }],
  })
  expect(organizationCollectionGroupAccessFindByCollection(database, organizationUuid, collectionUuid)).toEqual({
    success: true,
    data: [{ groupUuid, hidePasswords: true, manage: false, readOnly: true }],
  })
  database.run("DELETE FROM users_collections WHERE user_uuid = ? AND collection_uuid = ?", [
    memberUuid,
    collectionUuid,
  ])
  expect(organizationCollectionFindByUser(database, memberUuid, false)).toEqual({ success: true, data: [] })
  expect(organizationCollectionAccessFindByUser(database, collectionUuid, memberUuid, true)).toEqual({
    success: true,
    data: { hidePasswords: true, manage: false, readOnly: true },
  })

  const removeResult = organizationCollectionAssignmentsReplace(
    database,
    organizationUuid,
    collectionUuid,
    [],
    [],
    "2026-08-28T00:00:02.000Z",
  )
  expect(removeResult).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT COUNT(*) AS count FROM users_collections").get()).toEqual({ count: 0 })
  expect(database.query("SELECT COUNT(*) AS count FROM collections_groups").get()).toEqual({ count: 0 })
  expect(database.query("SELECT updated_at FROM users WHERE uuid = ?").get(memberUuid)).toEqual({
    updated_at: "2026-08-28T00:00:02.000Z",
  })
})

test("organization-wide access is not persisted as a direct collection assignment", () => {
  const database = databaseCreate()
  const result = organizationCollectionAssignmentsReplace(
    database,
    organizationUuid,
    collectionUuid,
    [],
    [{ id: ownerMembershipUuid, hidePasswords: true, manage: false, readOnly: true }],
    "2026-08-28T00:00:03.000Z",
  )

  expect(result).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT COUNT(*) AS count FROM users_collections").get()).toEqual({ count: 0 })
})
