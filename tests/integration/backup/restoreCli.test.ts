import { Database } from "bun:sqlite"
import { expect, test } from "bun:test"
import { sql } from "drizzle-orm"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { backupBundleCreate } from "../../../src/server/backup/backupBundleCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseMigrate } from "../../../src/server/database/databaseMigrate.js"
import { databaseOpen } from "../../../src/server/database/databaseOpen.js"

test("restore CLI restores a validated backup and reports its quarantine", async () => {
  const directory = mkdtempSync(join(tmpdir(), "onewarden-restore-cli-test-"))
  try {
    const databasePath = join(directory, "onewarden.sqlite3")
    const sendsFolder = join(directory, "sends")
    const attachmentsFolder = join(directory, "attachments")
    const backupRoot = join(directory, "backups")
    writeFileSync(join(directory, "placeholder"), "keep")
    const databaseResult = databaseOpen(databasePath)
    expect(databaseResult.success).toBe(true)
    if (!databaseResult.success) return
    databaseResult.data.drizzle.run(sql.raw("CREATE TABLE restore_cli_entries (value TEXT NOT NULL)"))
    databaseResult.data.drizzle.run(sql`INSERT INTO restore_cli_entries (value) VALUES (${"backup"})`)
    expect(databaseMigrate(databaseResult.data).success).toBe(true)
    databaseClose(databaseResult.data)

    const backupResult = await backupBundleCreate({
      attachmentsFolder,
      databasePath,
      destinationRoot: backupRoot,
      sendsFolder,
    })
    expect(backupResult.success).toBe(true)
    if (!backupResult.success) return

    const currentDatabaseResult = databaseOpen(databasePath)
    expect(currentDatabaseResult.success).toBe(true)
    if (!currentDatabaseResult.success) return
    currentDatabaseResult.data.drizzle.run(sql`INSERT INTO restore_cli_entries (value) VALUES (${"current"})`)
    databaseClose(currentDatabaseResult.data)

    const projectRoot = resolve(import.meta.dir, "../../..")
    const processResult = spawnSync("bun", ["run", "tools/backup/restoreCli.ts", backupResult.data], {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ATTACHMENTS_FOLDER: attachmentsFolder,
        BACKUP_FOLDER: join(directory, "unused-default-root"),
        DATABASE_PATH: databasePath,
        SENDS_FOLDER: sendsFolder,
      },
    })
    expect(processResult.status).toBe(0)
    expect(processResult.stdout).toContain("Restore completed; previous data quarantined at")
    expect(readFileSync(join(directory, "placeholder"), "utf8")).toBe("keep")
    const restoredDatabase = new Database(databasePath, { readonly: true })
    expect(restoredDatabase.query("SELECT value FROM restore_cli_entries ORDER BY rowid").all()).toEqual([
      { value: "backup" },
    ])
    restoredDatabase.close()
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
})
