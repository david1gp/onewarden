import { copyFileSync, existsSync } from "node:fs"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { AdminBackupAdapter } from "./adminBackupAdapter.js"

export function adminBackupAdapterCreate(databasePath: string | undefined): AdminBackupAdapter {
  return {
    create: () => {
      const op = "adminBackupDatabase"
      if (databasePath === undefined || databasePath === ":memory:")
        return resultErrorCreate(op, "Can't back up current DB (Only SQLite supports this feature)", {
          code: "platform.invalid-request",
        })
      if (!existsSync(databasePath))
        return resultErrorCreate(op, "Backup was unsuccessful Database file does not exist")
      const backupPath = `${databasePath}.backup`
      try {
        copyFileSync(databasePath, backupPath)
        return resultCreate(backupPath)
      } catch {
        return resultErrorCreate(op, "Backup was unsuccessful Database copy failed")
      }
    },
  }
}
