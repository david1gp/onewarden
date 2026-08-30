import { databasePathIsMemory } from "../../database/databasePathIsMemory.js"
import { backupBundleCreate } from "../../backup/backupBundleCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { AdminBackupAdapter } from "./adminBackupAdapter.js"

export function adminBackupAdapterCreate(options: {
  attachmentsFolder?: string
  databasePath: string | undefined
  destinationRoot?: string
  sendsFolder?: string
}): AdminBackupAdapter {
  const attachmentsFolder = options.attachmentsFolder ?? "./data/attachments"
  const destinationRoot = options.destinationRoot ?? "./data/backups"
  const sendsFolder = options.sendsFolder ?? "./data/sends"

  return {
    create: async () => {
      const op = "adminBackupDatabase"
      if (options.databasePath === undefined || databasePathIsMemory(options.databasePath))
        return resultErrorCreate(op, "Can't back up current DB (Only SQLite supports this feature)", {
          code: "platform.invalid-request",
        })
      const backupResult = await backupBundleCreate({
        attachmentsFolder,
        databasePath: options.databasePath,
        destinationRoot,
        sendsFolder,
      })
      if (backupResult.success) return resultCreate(backupResult.data)
      if (backupResult.errorMessage === "Database file does not exist.")
        return resultErrorCreate(op, "Backup was unsuccessful Database file does not exist")
      return resultErrorCreate(op, "Backup was unsuccessful Database copy failed")
    },
  }
}
