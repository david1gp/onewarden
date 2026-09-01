import { Database } from "bun:sqlite"
import { afterEach, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { sql } from "drizzle-orm"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { backupBundleCreate } from "../../../../src/server/backup/backupBundleCreate.js"
import { databaseClose } from "../../../../src/server/database/databaseClose.js"
import { databaseMigrate } from "../../../../src/server/database/databaseMigrate.js"
import { databaseOpen } from "../../../../src/server/database/databaseOpen.js"
import type { DatabaseConnection } from "../../../../src/server/database/database.js"

const temporaryDirectories: string[] = []

function temporaryDirectoryCreate(): string {
  const directory = mkdtempSync(join(tmpdir(), "onewarden-backup-test-"))
  temporaryDirectories.push(directory)
  return directory
}

function databaseCreate(path: string): DatabaseConnection {
  const result = databaseOpen(path)
  if (!result.success) throw new Error(result.errorMessage)
  const migrationResult = databaseMigrate(result.data)
  if (!migrationResult.success) throw new Error(migrationResult.errorMessage)
  return result.data
}

function manifestRead(path: string): {
  format: string
  version: number
  schemaVersion: number
  files: Array<{ path: string; size: number; sha256: string }>
} {
  return JSON.parse(readFileSync(path, "utf8")) as {
    format: string
    version: number
    schemaVersion: number
    files: Array<{ path: string; size: number; sha256: string }>
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

test("backupBundleCreate snapshots WAL state, storage files, and integrity metadata atomically", async () => {
  const directory = temporaryDirectoryCreate()
  const databasePath = join(directory, "onewarden.sqlite3")
  const sendsFolder = join(directory, "sends")
  const attachmentsFolder = join(directory, "attachments")
  const destinationRoot = join(directory, "backups")
  mkdirSync(join(sendsFolder, "send-one"), { recursive: true })
  mkdirSync(join(attachmentsFolder, "cipher-one"), { recursive: true })
  writeFileSync(join(sendsFolder, "send-one", "payload.txt"), "send payload")
  writeFileSync(join(attachmentsFolder, "cipher-one", "attachment.bin"), Buffer.from([1, 2, 3, 4]))

  const liveDatabase = databaseCreate(databasePath)
  liveDatabase.drizzle.run(sql.raw("CREATE TABLE backup_wal_entries (value TEXT NOT NULL)"))
  liveDatabase.drizzle.run(sql`INSERT INTO backup_wal_entries (value) VALUES (${"written in WAL"})`)
  expect(existsSync(`${databasePath}-wal`)).toBe(true)

  const result = await backupBundleCreate({
    attachmentsFolder,
    databasePath,
    destinationRoot,
    sendsFolder,
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toMatch(/onewarden-backup-/)
  expect(readdirSync(destinationRoot).every((name) => !name.endsWith(".tmp"))).toBe(true)

  const manifest = manifestRead(join(result.data, "manifest.json"))
  expect(manifest).toMatchObject({ format: "onewarden-backup", version: 1, schemaVersion: 20 })
  const schemaVersions = liveDatabase.drizzle.all<{ version: number }>(sql`SELECT version FROM schema_version`)
  expect(manifest.schemaVersion).toBe(Math.max(...schemaVersions.map((row) => row.version)))
  expect(manifest.files.map((file) => file.path)).toEqual([
    "attachments/cipher-one/attachment.bin",
    "database.sqlite3",
    "sends/send-one/payload.txt",
  ])
  for (const file of manifest.files) {
    expect(file.path.startsWith("/")).toBe(false)
    expect(file.path.includes(".."), file.path).toBe(false)
    const bytes = readFileSync(join(result.data, file.path))
    expect(file.size).toBe(bytes.byteLength)
    expect(file.sha256).toBe(createHash("sha256").update(bytes).digest("hex"))
  }

  const snapshot = new Database(join(result.data, "database.sqlite3"), { readonly: true })
  expect(snapshot.query("SELECT value FROM backup_wal_entries").get()).toEqual({ value: "written in WAL" })
  snapshot.close()
  databaseClose(liveDatabase)
})

test("backupBundleCreate rejects in-memory databases and symlinked storage", async () => {
  const directory = temporaryDirectoryCreate()
  const sendsFolder = join(directory, "sends")
  const attachmentsFolder = join(directory, "attachments")
  const destinationRoot = join(directory, "backups")
  mkdirSync(sendsFolder, { recursive: true })
  mkdirSync(attachmentsFolder, { recursive: true })
  writeFileSync(join(attachmentsFolder, "secret.txt"), "secret")
  symlinkSync(join(attachmentsFolder, "secret.txt"), join(sendsFolder, "linked-secret.txt"))

  const inMemoryResult = await backupBundleCreate({
    attachmentsFolder,
    databasePath: ":memory:",
    destinationRoot,
    sendsFolder,
  })
  expect(inMemoryResult).toMatchObject({ success: false, op: "backupBundleCreate" })

  const databasePath = join(directory, "onewarden.sqlite3")
  const database = databaseCreate(databasePath)
  const symlinkResult = await backupBundleCreate({
    attachmentsFolder,
    databasePath,
    destinationRoot,
    sendsFolder,
  })
  expect(symlinkResult).toMatchObject({ success: false, errorMessage: "Configured storage must not contain symlinks." })
  rmSync(join(sendsFolder, "linked-secret.txt"))
  const pathEscapeResult = await backupBundleCreate({
    attachmentsFolder,
    databasePath,
    destinationRoot: join(sendsFolder, "backups"),
    sendsFolder,
  })
  expect(pathEscapeResult).toMatchObject({
    success: false,
    errorMessage: "Backup destination cannot be inside configured storage.",
  })
  databaseClose(database)
})

test("backupBundleCreate omits S3 attachment objects from filesystem bundles", async () => {
  const directory = temporaryDirectoryCreate()
  const databasePath = join(directory, "onewarden.sqlite3")
  const sendsFolder = join(directory, "sends")
  mkdirSync(sendsFolder, { recursive: true })
  writeFileSync(join(sendsFolder, "send.txt"), "send")
  const database = databaseCreate(databasePath)

  const result = await backupBundleCreate({
    attachmentsFolder: "s3://onewarden-attachments/production",
    databasePath,
    destinationRoot: join(directory, "backups"),
    sendsFolder,
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(manifestRead(join(result.data, "manifest.json")).files.map((file) => file.path)).toEqual([
    "database.sqlite3",
    "sends/send.txt",
  ])
  databaseClose(database)
})
