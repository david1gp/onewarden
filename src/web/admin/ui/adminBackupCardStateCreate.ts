import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export interface AdminBackupCardProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function adminBackupCardStateCreate(props: AdminBackupCardProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const isBackingUp = createSignalObject(false)
  const lastBackupResult = createSignalObject<string | null>(null)

  const handleCreateBackup = async () => {
    isBackingUp.set(true)
    const result = await apiClient.backupDatabase()
    isBackingUp.set(false)

    if (result.success) {
      lastBackupResult.set(result.data)
      props.onNotifySuccess?.("Database backup created successfully!")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    isBackingUp: isBackingUp.get,
    lastBackupResult: lastBackupResult.get,
    handleCreateBackup,
  }
}
