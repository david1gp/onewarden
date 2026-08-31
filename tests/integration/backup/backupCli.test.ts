import { expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseMigrate } from "../../../src/server/database/databaseMigrate.js"
import { databaseOpen } from "../../../src/server/database/databaseOpen.js"

test("backup CLI creates a bundle in an explicit destination root", () => {
  const directory = mkdtempSync(join(tmpdir(), "onewarden-backup-cli-test-"))
  try {
    const databasePath = join(directory, "onewarden.sqlite3")
    const sendsFolder = join(directory, "sends")
    const attachmentsFolder = join(directory, "attachments")
    const destinationRoot = join(directory, "backup-root")
    const databaseResult = databaseOpen(databasePath)
    expect(databaseResult.success).toBe(true)
    if (!databaseResult.success) return
    expect(databaseMigrate(databaseResult.data).success).toBe(true)
    databaseClose(databaseResult.data)

    const projectRoot = resolve(import.meta.dir, "../../..")
    const processResult = spawnSync("bun", ["run", "backup", "--", destinationRoot], {
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
    expect(processResult.stdout).toContain("Backup bundle created at")

    const bundles = readdirSync(destinationRoot)
    expect(bundles).toHaveLength(1)
    expect(existsSync(join(destinationRoot, bundles[0] ?? "", "manifest.json"))).toBe(true)
    expect(readFileSync(join(destinationRoot, bundles[0] ?? "", "manifest.json"), "utf8")).toContain(
      '"schemaVersion": 20',
    )
  } finally {
    rmSync(directory, { force: true, recursive: true })
  }
})
