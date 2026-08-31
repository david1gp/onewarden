import { afterEach, expect, test } from "bun:test"
import type { AttachmentFileStorageAdapter } from "../../../src/server/contexts/attachments/attachmentFileStorageAdapter.js"
import { attachmentFileStorageAdapterCreate } from "../../../src/server/contexts/attachments/attachmentFileStorageAdapterCreate.js"
import { cipherTrashPurge } from "../../../src/server/contexts/ciphers/cipherTrashPurge.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

const now = "2026-08-31T00:00:00.000Z"
const expired = "2026-07-31T23:59:59.999Z"
const expiryBoundary = "2026-08-01T00:00:00.000Z"
const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function userInsert(database: DatabaseConnection, userUuid: string, updatedAt = now): void {
  database.run(
    `INSERT INTO users (
       uuid, created_at, updated_at, email, name, password_hash, salt,
       password_iterations, akey, security_stamp
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userUuid,
      now,
      updatedAt,
      `${userUuid}@example.com`,
      userUuid,
      new Uint8Array(),
      new Uint8Array(),
      600_000,
      "akey",
      "stamp",
    ],
  )
}

function cipherInsert(database: DatabaseConnection, cipherUuid: string, deletedAt: string, userUuid: string): void {
  database.run(
    `INSERT INTO ciphers (
       uuid, created_at, updated_at, user_uuid, organization_uuid, key, atype,
       name, notes, fields, data, password_history, deleted_at, reprompt
     ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, NULL, NULL, ?, NULL, ?, NULL)`,
    [cipherUuid, now, now, userUuid, 1, cipherUuid, "{}", deletedAt],
  )
}

function attachmentInsert(database: DatabaseConnection, attachmentId: string, cipherUuid: string): void {
  database.run("INSERT INTO attachments (id, cipher_uuid, file_name, file_size, akey) VALUES (?, ?, ?, ?, ?)", [
    attachmentId,
    cipherUuid,
    `${attachmentId}.txt`,
    3,
    "attachment-key",
  ])
}

function storageWithFailure(failedCipherUuid: string | undefined): {
  storage: AttachmentFileStorageAdapter
  setFailedCipherUuid: (value: string | undefined) => void
} {
  const storage = attachmentFileStorageAdapterCreate()
  const deleteAll = storage.delete
  let failed = failedCipherUuid
  storage.delete = async (cipherUuid, attachmentId) => {
    if (cipherUuid === failed) return resultErrorCreate("testAttachmentDelete", "Attachment delete failed.")
    return deleteAll(cipherUuid, attachmentId)
  }
  return { setFailedCipherUuid: (value) => (failed = value), storage }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("cipherTrashPurge strictly honors the expiry boundary, removes attachments, updates revision, and is idempotent", async () => {
  const database = databaseCreate()
  const userUuid = "trash-user"
  userInsert(database, userUuid)
  cipherInsert(database, "expired-cipher", expired, userUuid)
  cipherInsert(database, "boundary-cipher", expiryBoundary, userUuid)
  cipherInsert(database, "fresh-cipher", "2026-08-02T00:00:00.000Z", userUuid)
  attachmentInsert(database, "expired-attachment", "expired-cipher")
  const storage = attachmentFileStorageAdapterCreate()
  expect((await storage.write("expired-cipher", "expired-attachment", new Uint8Array([1, 2, 3]))).success).toBe(true)

  const result = await cipherTrashPurge(database, clockTestCreate(now), storage)

  expect(result).toEqual({ success: true, data: 1 })
  expect(database.query("SELECT uuid FROM ciphers ORDER BY uuid").all()).toEqual([
    { uuid: "boundary-cipher" },
    { uuid: "fresh-cipher" },
  ])
  expect(database.query("SELECT id FROM attachments").all()).toEqual([])
  expect(database.query("SELECT updated_at FROM users WHERE uuid = ?").get(userUuid)).toEqual({ updated_at: now })
  const attachmentReadResult = await storage.read("expired-cipher", "expired-attachment")
  expect(attachmentReadResult.success).toBe(true)
  if (attachmentReadResult.success) expect(attachmentReadResult.data).toBeNull()
  expect(await cipherTrashPurge(database, clockTestCreate(now), storage)).toEqual({ success: true, data: 0 })
})

test("cipherTrashPurge processes only one bounded batch and retries remaining trash", async () => {
  const database = databaseCreate()
  const userUuid = "batch-user"
  userInsert(database, userUuid)
  for (let index = 0; index < 101; index += 1)
    cipherInsert(database, `batch-${String(index).padStart(3, "0")}`, expired, userUuid)
  const storage = attachmentFileStorageAdapterCreate()
  const clock = clockTestCreate(now)

  expect(await cipherTrashPurge(database, clock, storage)).toEqual({ success: true, data: 100 })
  expect(database.query("SELECT COUNT(*) AS count FROM ciphers").get()).toEqual({ count: 1 })
  expect(await cipherTrashPurge(database, clock, storage)).toEqual({ success: true, data: 1 })
  expect(await cipherTrashPurge(database, clock, storage)).toEqual({ success: true, data: 0 })
})

test("cipherTrashPurge continues after an attachment failure and retries the failed cipher", async () => {
  const database = databaseCreate()
  const userUuid = "partial-user"
  userInsert(database, userUuid)
  cipherInsert(database, "failed-cipher", expired, userUuid)
  cipherInsert(database, "successful-cipher", expired, userUuid)
  attachmentInsert(database, "failed-attachment", "failed-cipher")
  attachmentInsert(database, "successful-attachment", "successful-cipher")
  const failure = storageWithFailure("failed-cipher")
  const clock = clockTestCreate(now)

  const result = await cipherTrashPurge(database, clock, failure.storage)

  expect(result).toMatchObject({
    success: false,
    op: "cipherTrashPurge",
    errorMessage: "Trash purge partially failed.",
  })
  expect(database.query("SELECT uuid FROM ciphers ORDER BY uuid").all()).toEqual([{ uuid: "failed-cipher" }])
  expect(database.query("SELECT id FROM attachments").all()).toEqual([{ id: "failed-attachment" }])
  failure.setFailedCipherUuid(undefined)
  expect(await cipherTrashPurge(database, clock, failure.storage)).toEqual({ success: true, data: 1 })
  expect(await cipherTrashPurge(database, clock, failure.storage)).toEqual({ success: true, data: 0 })
})

test("cipherTrashPurge retains the cipher for retry when database deletion fails after storage cleanup", async () => {
  const database = databaseCreate()
  const userUuid = "database-failure-user"
  userInsert(database, userUuid)
  cipherInsert(database, "database-failure-cipher", expired, userUuid)
  attachmentInsert(database, "database-failure-attachment", "database-failure-cipher")
  const storage = attachmentFileStorageAdapterCreate()
  await storage.write("database-failure-cipher", "database-failure-attachment", new Uint8Array([1, 2, 3]))
  database.exec(
    `CREATE TRIGGER fail_trash_cipher_delete BEFORE DELETE ON ciphers
     WHEN OLD.uuid = 'database-failure-cipher'
     BEGIN SELECT RAISE(ABORT, 'expected purge failure'); END`,
  )

  const failedResult = await cipherTrashPurge(database, clockTestCreate(now), storage)

  expect(failedResult).toMatchObject({
    success: false,
    op: "cipherTrashPurge",
    errorMessage: "Trash purge partially failed.",
  })
  expect(database.query("SELECT uuid FROM ciphers").all()).toEqual([{ uuid: "database-failure-cipher" }])
  expect(database.query("SELECT id FROM attachments").all()).toEqual([{ id: "database-failure-attachment" }])
  expect(await storage.read("database-failure-cipher", "database-failure-attachment")).toEqual({
    success: true,
    data: null,
  })

  database.exec("DROP TRIGGER fail_trash_cipher_delete")
  expect(await cipherTrashPurge(database, clockTestCreate(now), storage)).toEqual({ success: true, data: 1 })
  expect(await cipherTrashPurge(database, clockTestCreate(now), storage)).toEqual({ success: true, data: 0 })
})

test("cipherTrashPurge updates revisions for group-authorized organization members", async () => {
  const database = databaseCreate()
  const ownerUuid = "group-owner"
  const memberUuid = "group-member"
  userInsert(database, ownerUuid, "2026-08-30T00:00:00.000Z")
  userInsert(database, memberUuid, "2026-08-30T00:00:00.000Z")
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    "trash-organization",
    "Trash Organization",
    "trash@example.com",
  ])
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, atype, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["group-owner-membership", ownerUuid, "trash-organization", 1, "organization-key", 0, 2],
  )
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, atype, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["group-member-membership", memberUuid, "trash-organization", 0, "organization-key", 2, 2],
  )
  database.run(
    `INSERT INTO groups (uuid, organizations_uuid, access_all, name, creation_date, revision_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ["trash-group", "trash-organization", 1, "Trash Group", now, now],
  )
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    "trash-collection",
    "trash-organization",
    "Trash Collection",
  ])
  database.run("INSERT INTO groups_users (groups_uuid, users_organizations_uuid) VALUES (?, ?)", [
    "trash-group",
    "group-member-membership",
  ])
  database.run(
    `INSERT INTO ciphers (
       uuid, created_at, updated_at, user_uuid, organization_uuid, key, atype,
       name, notes, fields, data, password_history, deleted_at, reprompt
     ) VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, NULL, NULL, ?, NULL, ?, NULL)`,
    ["group-cipher", now, now, "trash-organization", 1, "group-cipher", "{}", expired],
  )
  database.run("INSERT INTO ciphers_collections (cipher_uuid, collection_uuid) VALUES (?, ?)", [
    "group-cipher",
    "trash-collection",
  ])

  expect(await cipherTrashPurge(database, clockTestCreate(now), attachmentFileStorageAdapterCreate())).toEqual({
    success: true,
    data: 1,
  })
  expect(
    database.query("SELECT updated_at FROM users WHERE uuid IN (?, ?) ORDER BY uuid").all(ownerUuid, memberUuid),
  ).toEqual([{ updated_at: now }, { updated_at: now }])
})
