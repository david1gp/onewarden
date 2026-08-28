import { afterEach, expect, test } from "bun:test"
import { attachmentFindByCipher } from "../../../src/server/contexts/attachments/attachmentFindByCipher.js"
import { attachmentFindById } from "../../../src/server/contexts/attachments/attachmentFindById.js"
import { attachmentSave } from "../../../src/server/contexts/attachments/attachmentSave.js"
import { attachmentSizeByOrganization } from "../../../src/server/contexts/attachments/attachmentSizeByOrganization.js"
import { attachmentSizeByUser } from "../../../src/server/contexts/attachments/attachmentSizeByUser.js"
import { attachmentToJson } from "../../../src/server/contexts/attachments/attachmentToJson.js"
import { cipherSave } from "../../../src/server/contexts/ciphers/cipherSave.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const databases: DatabaseConnection[] = []
const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("attachment persistence serializes metadata and aggregates personal and organization quota usage", async () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  database.run(
    `INSERT INTO users (
       uuid, enabled, created_at, updated_at, verified_at, last_verifying_at, login_verify_count,
       email, email_new, email_new_token, name, password_hash, salt, password_iterations,
       password_hint, akey, private_key, public_key, security_stamp, stamp_exception,
       equivalent_domains, excluded_globals, client_kdf_type, client_kdf_iter,
       client_kdf_memory, client_kdf_parallelism, api_key, avatar_color, external_id
     ) VALUES (?, 1, ?, ?, ?, NULL, 0, ?, NULL, NULL, ?, ?, ?, 100000, NULL, ?, NULL, NULL, ?, NULL, '[]', '[]', 0, 600000, NULL, NULL, NULL, NULL, NULL)`,
    [
      "attachment-user",
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
      "attachment@example.com",
      "Attachment User",
      new Uint8Array([1]),
      new Uint8Array([2]),
      "akey",
      "stamp",
    ],
  )
  const cipher = {
    uuid: "cipher-one",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid: "attachment-user",
    organizationUuid: null,
    key: null,
    type: 1,
    name: "Cipher",
    notes: null,
    fields: null,
    data: "{}",
    passwordHistory: null,
    deletedAt: null,
    reprompt: null,
  }
  expect(cipherSave(database, cipher).success).toBe(true)
  expect(
    attachmentSave(database, {
      cipherUuid: cipher.uuid,
      fileName: "encrypted-name",
      fileSize: 12,
      id: "attachment-one",
      key: "encrypted-key",
    }).success,
  ).toBe(true)
  expect(attachmentFindById(database, "ATTACHMENT-ONE")).toMatchObject({
    success: true,
    data: { cipherUuid: "cipher-one", fileSize: 12, id: "attachment-one" },
  })
  expect(attachmentFindByCipher(database, cipher.uuid)).toMatchObject({
    success: true,
    data: [{ id: "attachment-one" }],
  })
  expect(attachmentSizeByUser(database, "attachment-user")).toEqual({ success: true, data: 12 })

  const jsonResult = await attachmentToJson(
    {
      cipherUuid: cipher.uuid,
      fileName: "encrypted-name",
      fileSize: 12,
      id: "attachment-one",
      key: "encrypted-key",
    },
    {
      clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
      origin: "https://vault.example",
      privateKey: keyPairResult.data.privateKey,
    },
  )
  expect(jsonResult).toMatchObject({
    success: true,
    data: {
      fileName: "encrypted-name",
      key: "encrypted-key",
      object: "attachment",
      size: "12",
      sizeName: "12.00 bytes",
    },
  })
  expect(jsonResult.success ? jsonResult.data.url : "").toContain("/attachments/cipher-one/attachment-one?token=")
})

test("attachment organization totals are persisted through cipher ownership", () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    "org-one",
    "Org",
    "org@example.com",
  ])
  expect(
    cipherSave(database, {
      uuid: "org-cipher",
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      userUuid: null,
      organizationUuid: "org-one",
      key: null,
      type: 1,
      name: "Org Cipher",
      notes: null,
      fields: null,
      data: "{}",
      passwordHistory: null,
      deletedAt: null,
      reprompt: null,
    }).success,
  ).toBe(true)
  expect(
    attachmentSave(database, {
      cipherUuid: "org-cipher",
      fileName: "name",
      fileSize: 7,
      id: "org-attachment",
      key: null,
    }).success,
  ).toBe(true)
  expect(attachmentSizeByOrganization(database, "org-one")).toEqual({ success: true, data: 7 })
})
