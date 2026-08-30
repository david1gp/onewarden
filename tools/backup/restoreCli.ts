import { backupBundleRestore } from "../../src/server/backup/backupBundleRestore.js"
import { serverConfigLoad } from "../../src/server/config/serverConfigLoad.js"

if (process.argv.length !== 3) {
  console.error("Usage: bun run restore -- <backup>")
  process.exitCode = 1
} else {
  const configResult = serverConfigLoad()
  if (!configResult.success) {
    console.error(`Restore configuration is invalid: ${configResult.errorMessage}`)
    process.exitCode = 1
  } else {
    const restoreResult = await backupBundleRestore({
      attachmentsFolder: configResult.data.ATTACHMENTS_FOLDER,
      backupDirectory: process.argv[2] ?? "",
      databasePath: configResult.data.DATABASE_PATH,
      sendsFolder: configResult.data.SENDS_FOLDER,
    })
    if (!restoreResult.success) {
      console.error(`Restore failed: ${restoreResult.errorMessage}`)
      process.exitCode = 1
    } else {
      console.log(`Restore completed; previous data quarantined at ${restoreResult.data}`)
    }
  }
}
