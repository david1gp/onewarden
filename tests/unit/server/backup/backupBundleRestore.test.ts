import { Database } from "bun:sqlite"
import { afterEach, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { sql } from "drizzle-orm"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { backupBundleCreate } from "../../../../src/server/backup/backupBundleCreate.js"
import { backupBundleRestore } from "../../../../src/server/backup/backupBundleRestore.js"
import { backupManifestValidate } from "../../../../src/server/backup/backupManifestValidate.js"
import { databaseClose } from "../../../../src/server/database/databaseClose.js"
import { databaseMigrate } from "../../../../src/server/database/databaseMigrate.js"
import { databaseOpen } from "../../../../src/server/database/databaseOpen.js"
import type { DatabaseConnection } from "../../../../src/server/database/database.js"

const temporaryDirectories: string[] = []

function temporaryDirectoryCreate(): string {
  const directory = mkdtempSync(join(tmpdir(), "onewarden-restore-test-"))
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

function backupPathsCreate(directory: string): {
  attachmentsFolder: string
  backupRoot: string
  databasePath: string
  sendsFolder: string
} {
  const dataDirectory = join(directory, "data")
  const paths = {
    attachmentsFolder: join(dataDirectory, "attachments"),
    backupRoot: join(dataDirectory, "backups"),
    databasePath: join(dataDirectory, "onewarden.sqlite3"),
    sendsFolder: join(dataDirectory, "sends"),
  }
  return paths
}

async function backupCreate(directory: string): Promise<{
  attachmentsFolder: string
  backupDirectory: string
  databasePath: string
  sendsFolder: string
}> {
  const paths = backupPathsCreate(directory)
  mkdirSync(paths.sendsFolder, { recursive: true })
  mkdirSync(paths.attachmentsFolder, { recursive: true })
  writeFileSync(join(paths.sendsFolder, "send.txt"), "backup send")
  writeFileSync(join(paths.attachmentsFolder, "attachment.txt"), "backup attachment")
  const database = databaseCreate(paths.databasePath)
  database.drizzle.run(sql.raw("CREATE TABLE restore_entries (value TEXT NOT NULL)"))
  database.drizzle.run(sql`INSERT INTO restore_entries (value) VALUES ( ${"backup"} )`)
  databaseClose(database)
  const backupResult = await backupBundleCreate({
    attachmentsFolder: paths.attachmentsFolder,
    databasePath: paths.databasePath,
    destinationRoot: paths.backupRoot,
    sendsFolder: paths.sendsFolder,
  })
  if (!backupResult.success) throw new Error(backupResult.errorMessage)
  return { ...paths, backupDirectory: backupResult.data }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

test("backupBundleRestore stages and atomically activates data while retaining a quarantine", async () => {
  const directory = temporaryDirectoryCreate()
  const paths = await backupCreate(directory)
  writeFileSync(join(directory, ".env"), "DATABASE_PATH=preserve-me\n")

  const updatedDatabase = databaseCreate(paths.databasePath)
  updatedDatabase.drizzle.run(sql`INSERT INTO restore_entries (value) VALUES ( ${"current"} )`)
  databaseClose(updatedDatabase)
  writeFileSync(join(paths.sendsFolder, "send.txt"), "current send")
  writeFileSync(join(paths.attachmentsFolder, "current.txt"), "current attachment")

  const result = await backupBundleRestore({
    attachmentsFolder: paths.attachmentsFolder,
    backupDirectory: paths.backupDirectory,
    databasePath: paths.databasePath,
    sendsFolder: paths.sendsFolder,
  })

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data).toMatch(/onewarden-restore-quarantine-/)
  expect(readFileSync(join(directory, ".env"), "utf8")).toBe("DATABASE_PATH=preserve-me\n")
  expect(readFileSync(join(paths.sendsFolder, "send.txt"), "utf8")).toBe("backup send")
  expect(existsSync(join(paths.attachmentsFolder, "current.txt"))).toBe(false)

  const restoredDatabase = new Database(paths.databasePath, { readonly: true })
  expect(restoredDatabase.query("SELECT value FROM restore_entries ORDER BY rowid").all()).toEqual([
    { value: "backup" },
  ])
  restoredDatabase.close()

  const quarantinedDatabase = new Database(join(result.data, "database", "onewarden.sqlite3"), { readonly: true })
  expect(quarantinedDatabase.query("SELECT value FROM restore_entries ORDER BY rowid").all()).toEqual([
    { value: "backup" },
    { value: "current" },
  ])
  quarantinedDatabase.close()
  expect(readFileSync(join(result.data, "sends", "send.txt"), "utf8")).toBe("current send")
})

test("backupManifestValidate rejects unsupported versions, corrupt hashes, traversal, symlinks, and corrupt SQLite", async () => {
  const directory = temporaryDirectoryCreate()
  const paths = await backupCreate(directory)
  const manifestPath = join(paths.backupDirectory, "manifest.json")
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    schemaVersion: number
    version: number
    files: Array<{ path: string; size: number; sha256: string }>
  }

  manifest.version = 2
  writeFileSync(manifestPath, JSON.stringify(manifest))
  expect(await backupManifestValidate(paths.backupDirectory)).toMatchObject({ success: false })

  manifest.version = 1
  const databaseFile = manifest.files.find((file) => file.path === "database.sqlite3")
  if (databaseFile === undefined) return
  databaseFile.sha256 = "0".repeat(64)
  writeFileSync(manifestPath, JSON.stringify(manifest))
  expect(await backupManifestValidate(paths.backupDirectory)).toMatchObject({
    success: false,
    errorMessage: "Backup hash mismatch for database.sqlite3.",
  })

  databaseFile.sha256 = createHash("sha256")
    .update(readFileSync(join(paths.backupDirectory, "database.sqlite3")))
    .digest("hex")
  manifest.schemaVersion = 21
  writeFileSync(manifestPath, JSON.stringify(manifest))
  expect(await backupManifestValidate(paths.backupDirectory)).toMatchObject({ success: false })

  manifest.schemaVersion = 18
  databaseFile.path = "../database.sqlite3"
  writeFileSync(manifestPath, JSON.stringify(manifest))
  expect(await backupManifestValidate(paths.backupDirectory)).toMatchObject({ success: false })

  databaseFile.path = "database.sqlite3"
  const corruptDatabase = Buffer.from("not sqlite")
  writeFileSync(join(paths.backupDirectory, "database.sqlite3"), corruptDatabase)
  databaseFile.size = corruptDatabase.byteLength
  databaseFile.sha256 = createHash("sha256").update(corruptDatabase).digest("hex")
  writeFileSync(manifestPath, JSON.stringify(manifest))
  expect(await backupManifestValidate(paths.backupDirectory)).toMatchObject({
    success: false,
    errorMessage: "Backup database is not a valid SQLite database.",
  })

  symlinkSync(join(paths.backupDirectory, "database.sqlite3"), join(paths.backupDirectory, "sends", "linked.sqlite3"))
  expect(await backupManifestValidate(paths.backupDirectory)).toMatchObject({ success: false })
})

test("backupBundleRestore rejects in-memory targets before changing live data", async () => {
  const directory = temporaryDirectoryCreate()
  const paths = await backupCreate(directory)
  const result = await backupBundleRestore({
    attachmentsFolder: paths.attachmentsFolder,
    backupDirectory: paths.backupDirectory,
    databasePath: ":memory:",
    sendsFolder: paths.sendsFolder,
  })
  expect(result).toMatchObject({
    success: false,
    errorMessage: "In-memory database targets cannot be restored.",
  })
})

test("backupBundleRestore refuses to treat an S3 location as a filesystem target", async () => {
  const directory = temporaryDirectoryCreate()
  const paths = await backupCreate(directory)

  const result = await backupBundleRestore({
    attachmentsFolder: "s3://onewarden-attachments/production",
    backupDirectory: paths.backupDirectory,
    databasePath: paths.databasePath,
    sendsFolder: paths.sendsFolder,
  })

  expect(result).toMatchObject({
    success: false,
    errorMessage: "S3 attachment objects must be restored independently.",
  })
})
