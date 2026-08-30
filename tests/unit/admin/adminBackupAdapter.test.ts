import { afterEach, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { adminBackupAdapterCreate } from "../../../src/server/contexts/admin/adminBackupAdapterCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseMigrate } from "../../../src/server/database/databaseMigrate.js"
import { databaseOpen } from "../../../src/server/database/databaseOpen.js"

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

test("adminBackupAdapterCreate delegates to the operational backup bundle", async () => {
  const directory = mkdtempSync(join(tmpdir(), "onewarden-admin-backup-test-"))
  temporaryDirectories.push(directory)
  const databasePath = join(directory, "onewarden.sqlite3")
  const sendsFolder = join(directory, "sends")
  const attachmentsFolder = join(directory, "attachments")
  const destinationRoot = join(directory, "backups")
  mkdirSync(sendsFolder, { recursive: true })
  mkdirSync(attachmentsFolder, { recursive: true })
  writeFileSync(join(sendsFolder, "send.txt"), "send payload")
  writeFileSync(join(attachmentsFolder, "attachment.bin"), Buffer.from([1, 2, 3]))

  const databaseResult = databaseOpen(databasePath)
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return
  const migrationResult = databaseMigrate(databaseResult.data)
  expect(migrationResult.success).toBe(true)
  if (!migrationResult.success) {
    databaseClose(databaseResult.data)
    return
  }

  const adapter = adminBackupAdapterCreate({ attachmentsFolder, databasePath, destinationRoot, sendsFolder })
  const result = await adapter.create()
  databaseClose(databaseResult.data)

  expect(result.success).toBe(true)
  if (!result.success) return
  const manifest = JSON.parse(readFileSync(join(result.data, "manifest.json"), "utf8")) as {
    files: Array<{ path: string }>
  }
  expect(manifest.files.map((file) => file.path)).toEqual([
    "attachments/attachment.bin",
    "database.sqlite3",
    "sends/send.txt",
  ])
})

test("adminBackupAdapterCreate preserves the in-memory database compatibility error", async () => {
  const result = await adminBackupAdapterCreate({ databasePath: ":memory:" }).create()

  expect(result).toMatchObject({
    code: "platform.invalid-request",
    errorMessage: "Can't back up current DB (Only SQLite supports this feature)",
    op: "adminBackupDatabase",
    success: false,
  })
})
