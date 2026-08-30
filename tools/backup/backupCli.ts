import { backupBundleCreate } from "../../src/server/backup/backupBundleCreate.js"
import { serverConfigLoad } from "../../src/server/config/serverConfigLoad.js"

const configResult = serverConfigLoad()
if (!configResult.success) {
  console.error(`Backup configuration is invalid: ${configResult.errorMessage}`)
  process.exitCode = 1
} else {
  const destination = process.argv[2] ?? configResult.data.BACKUP_FOLDER
  if (process.argv.length > 3) {
    console.error("Usage: bun run backup -- [destination]")
    process.exitCode = 1
  } else {
    const backupResult = await backupBundleCreate({
      attachmentsFolder: configResult.data.ATTACHMENTS_FOLDER,
      databasePath: configResult.data.DATABASE_PATH,
      destinationRoot: destination,
      sendsFolder: configResult.data.SENDS_FOLDER,
    })
    if (!backupResult.success) {
      console.error(`Backup failed: ${backupResult.errorMessage}`)
      process.exitCode = 1
    } else {
      console.log(`Backup bundle created at ${backupResult.data}`)
    }
  }
}
