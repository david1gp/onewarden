import { afterEach, expect, test } from "bun:test"
import type { Result } from "#result"
import { cipherAccessFindByUser } from "../../../src/server/contexts/ciphers/cipherAccessFindByUser.js"
import type { Cipher } from "../../../src/server/contexts/ciphers/cipher.js"
import { cipherCollectionLinkSave } from "../../../src/server/contexts/ciphers/cipherCollectionLinkSave.js"
import { cipherCollectionsReplace } from "../../../src/server/contexts/ciphers/cipherCollectionsReplace.js"
import { cipherFindByUser } from "../../../src/server/contexts/ciphers/cipherFindByUser.js"
import { cipherSave } from "../../../src/server/contexts/ciphers/cipherSave.js"
import { cipherShare } from "../../../src/server/contexts/ciphers/cipherShare.js"
import { cipherShareSelected } from "../../../src/server/contexts/ciphers/cipherShareSelected.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const date = "2026-08-28T00:00:00.000Z"
const ownerUuid = "00000000-0000-4000-8000-000000000501"
const memberUuid = "00000000-0000-4000-8000-000000000502"
const organizationUuid = "00000000-0000-4000-8000-000000000503"
const ownerMembershipUuid = "00000000-0000-4000-8000-000000000504"
const memberMembershipUuid = "00000000-0000-4000-8000-000000000505"
const firstCollectionUuid = "00000000-0000-4000-8000-000000000506"
const secondCollectionUuid = "00000000-0000-4000-8000-000000000507"
const groupUuid = "00000000-0000-4000-8000-000000000508"
const cipherUuid = "00000000-0000-4000-8000-000000000509"
const databases: DatabaseConnection[] = []

function resultData<T>(result: Result<T>): T {
  if (!result.success) throw new Error(result.errorMessage)
  return result.data
}

function userSave(database: DatabaseConnection, uuid: string, email: string): void {
  database.run(
    `INSERT INTO users (
      uuid, created_at, updated_at, email, name, password_hash, salt,
      password_iterations, akey, security_stamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      date,
      date,
      email,
      email,
      new Uint8Array([1]),
      new Uint8Array([2]),
      100_000,
      `${uuid}-akey`,
      `${uuid}-stamp`,
    ],
  )
}

function cipherCreate(): Cipher {
  return {
    uuid: cipherUuid,
    createdAt: date,
    updatedAt: date,
    userUuid: ownerUuid,
    organizationUuid: null,
    key: "cipher-key",
    type: 1,
    name: "Shared cipher",
    notes: null,
    fields: null,
    data: JSON.stringify({ username: "user" }),
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
  userSave(database, ownerUuid, "owner@example.com")
  userSave(database, memberUuid, "member@example.com")
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
    firstCollectionUuid,
    organizationUuid,
    "First collection",
  ])
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    secondCollectionUuid,
    organizationUuid,
    "Second collection",
  ])
  database.run(
    "INSERT INTO groups (uuid, organizations_uuid, name, creation_date, revision_date) VALUES (?, ?, ?, ?, ?)",
    [groupUuid, organizationUuid, "Cipher group", date, date],
  )
  database.run("INSERT INTO groups_users (groups_uuid, users_organizations_uuid) VALUES (?, ?)", [
    groupUuid,
    memberMembershipUuid,
  ])
  const saveResult = cipherSave(database, cipherCreate())
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  return database
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("sharing transfers ownership, assigns collections, and notifies effective members through revisions", () => {
  const database = databaseCreate()
  const clock = clockTestCreate(date)
  const result = cipherShare(
    database,
    cipherUuid,
    ownerUuid,
    {
      type: 1,
      name: "Shared cipher",
      organizationId: organizationUuid,
      login: { username: "user" },
      lastKnownRevisionDate: date,
    },
    [firstCollectionUuid],
    clock,
  )

  expect(result.success).toBe(true)
  expect(database.query("SELECT user_uuid, organization_uuid FROM ciphers WHERE uuid = ?").get(cipherUuid)).toEqual({
    user_uuid: null,
    organization_uuid: organizationUuid,
  })
  expect(
    database.query("SELECT collection_uuid FROM ciphers_collections WHERE cipher_uuid = ?").all(cipherUuid),
  ).toEqual([{ collection_uuid: firstCollectionUuid }])
  expect(resultData(cipherFindByUser(database, memberUuid))).toHaveLength(0)

  database.run("INSERT INTO users_collections (user_uuid, collection_uuid) VALUES (?, ?)", [
    memberUuid,
    firstCollectionUuid,
  ])
  if (!result.success) return
  expect(resultData(cipherFindByUser(database, memberUuid))).toHaveLength(1)
  expect(resultData(cipherAccessFindByUser(database, result.data, memberUuid))).toEqual({
    hidePasswords: false,
    manage: false,
    readOnly: false,
  })
})

test("collection replacement removes links and rejects collections outside the organization", () => {
  const database = databaseCreate()
  const clock = clockTestCreate(date)
  const cipher = cipherCreate()
  cipher.organizationUuid = organizationUuid
  cipher.userUuid = null
  const saveResult = cipherSave(database, cipher)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const linkResult = cipherCollectionLinkSave(database, cipherUuid, firstCollectionUuid)
  if (!linkResult.success) throw new Error(linkResult.errorMessage)

  const replaceResult = cipherCollectionsReplace(database, cipherUuid, ownerUuid, [secondCollectionUuid], clock)
  expect(replaceResult.success).toBe(true)
  expect(
    database.query("SELECT collection_uuid FROM ciphers_collections WHERE cipher_uuid = ?").all(cipherUuid),
  ).toEqual([{ collection_uuid: secondCollectionUuid }])

  const invalidResult = cipherCollectionsReplace(database, cipherUuid, ownerUuid, ["missing"], clock)
  expect(invalidResult.success).toBe(false)
  expect(
    database.query("SELECT collection_uuid FROM ciphers_collections WHERE cipher_uuid = ?").all(cipherUuid),
  ).toEqual([{ collection_uuid: secondCollectionUuid }])
})

test("group access is effective and direct collection access overrides restrictive group flags", () => {
  const database = databaseCreate()
  const cipher = cipherCreate()
  cipher.organizationUuid = organizationUuid
  cipher.userUuid = null
  const saveResult = cipherSave(database, cipher)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const linkResult = cipherCollectionLinkSave(database, cipherUuid, firstCollectionUuid)
  if (!linkResult.success) throw new Error(linkResult.errorMessage)
  database.run(
    "INSERT INTO collections_groups (collections_uuid, groups_uuid, read_only, hide_passwords, manage) VALUES (?, ?, ?, ?, ?)",
    [firstCollectionUuid, groupUuid, 1, 1, 0],
  )

  expect(resultData(cipherFindByUser(database, memberUuid, true))).toHaveLength(1)
  expect(resultData(cipherAccessFindByUser(database, cipher, memberUuid, true))).toEqual({
    hidePasswords: true,
    manage: false,
    readOnly: true,
  })

  database.run("INSERT INTO users_collections (user_uuid, collection_uuid) VALUES (?, ?)", [
    memberUuid,
    firstCollectionUuid,
  ])
  expect(resultData(cipherAccessFindByUser(database, cipher, memberUuid, true))).toEqual({
    hidePasswords: false,
    manage: false,
    readOnly: false,
  })
})

test("bulk sharing rolls back earlier ownership transfers when a later cipher is invalid", () => {
  const database = databaseCreate()
  const secondCipherUuid = "00000000-0000-4000-8000-000000000510"
  const secondCipher = { ...cipherCreate(), uuid: secondCipherUuid }
  const saveResult = cipherSave(database, secondCipher)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)

  const result = cipherShareSelected(
    database,
    [
      {
        id: "missing-cipher",
        type: 1,
        name: "Missing",
        organizationId: organizationUuid,
        login: { username: "missing" },
      },
      {
        id: cipherUuid,
        type: 1,
        name: "Shared cipher",
        organizationId: organizationUuid,
        login: { username: "user" },
        lastKnownRevisionDate: date,
      },
    ],
    [firstCollectionUuid],
    ownerUuid,
    clockTestCreate(date),
  )

  expect(result.success).toBe(false)
  expect(database.query("SELECT user_uuid, organization_uuid FROM ciphers ORDER BY uuid").all()).toEqual([
    { user_uuid: ownerUuid, organization_uuid: null },
    { user_uuid: ownerUuid, organization_uuid: null },
  ])
  expect(database.query("SELECT COUNT(*) AS count FROM ciphers_collections").get()).toEqual({ count: 0 })
})
