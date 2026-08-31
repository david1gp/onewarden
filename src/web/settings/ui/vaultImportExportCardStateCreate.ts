import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { vaultExportExecute } from "../model/vaultExportExecute.js"
import type { VaultExportFormat } from "../model/vaultExportSchema.js"
import { vaultImportExecute } from "../model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../model/webSettingsApiClientCreate.js"

export interface VaultImportExportCardProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
  onNotifySuccess?: (message: string) => void
  onNotifyError?: (message: string) => void
}

export interface VaultImportSummary {
  cipherCount: number
  folderCount: number
  warnings: string[]
}

export function vaultImportExportCardStateCreate(props: VaultImportExportCardProps) {
  const apiClient = props.apiClient ?? webSettingsApiClientCreate()

  const subTab = createSignalObject<"import" | "export">("import")

  // Import state
  const importFormat = createSignalObject<"json" | "csv">("json")
  const importContent = createSignalObject("")
  const importFileName = createSignalObject<string | null>(null)
  const importFilePassword = createSignalObject("")
  const importMasterPassword = createSignalObject("")
  const isImporting = createSignalObject(false)
  const importValidationMessage = createSignalObject<string | null>(null)
  const importSummary = createSignalObject<VaultImportSummary | null>(null)

  // Export state
  const exportFormat = createSignalObject<VaultExportFormat>("json-decrypted")
  const exportFilePassword = createSignalObject("")
  const exportFilePasswordConfirm = createSignalObject("")
  const exportMasterPassword = createSignalObject("")
  const isExporting = createSignalObject(false)
  const exportValidationMessage = createSignalObject<string | null>(null)
  const lastExportData = createSignalObject<string | null>(null)

  const notifyImportProblem = (message: string) => {
    importValidationMessage.set(message)
    props.onNotifyError?.(message)
  }

  const notifyExportProblem = (message: string) => {
    exportValidationMessage.set(message)
    props.onNotifyError?.(message)
  }

  const setImportFormat = (format: "json" | "csv") => {
    importFormat.set(format)
    importValidationMessage.set(null)
  }

  const setImportContent = (content: string) => {
    importContent.set(content)
    importValidationMessage.set(null)
  }

  const setImportFilePassword = (password: string) => {
    importFilePassword.set(password)
    importValidationMessage.set(null)
  }

  const setImportMasterPassword = (password: string) => {
    importMasterPassword.set(password)
    importValidationMessage.set(null)
  }

  const setExportFormat = (format: VaultExportFormat) => {
    exportFormat.set(format)
    exportValidationMessage.set(null)
  }

  const setExportFilePassword = (password: string) => {
    exportFilePassword.set(password)
    exportValidationMessage.set(null)
  }

  const setExportFilePasswordConfirm = (password: string) => {
    exportFilePasswordConfirm.set(password)
    exportValidationMessage.set(null)
  }

  const setExportMasterPassword = (password: string) => {
    exportMasterPassword.set(password)
    exportValidationMessage.set(null)
  }

  const exportPasswordMismatch = () =>
    exportFormat.get() === "json-encrypted" &&
    exportFilePasswordConfirm.get().length > 0 &&
    exportFilePassword.get() !== exportFilePasswordConfirm.get()

  const canSubmitExport = () => {
    if (isExporting.get()) return false
    if (exportFormat.get() !== "json-encrypted") return true
    if (exportFilePassword.get().length === 0) return false
    return exportFilePassword.get() === exportFilePasswordConfirm.get()
  }

  const canSubmitImport = () => !isImporting.get() && importContent.get().trim().length > 0

  const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    importValidationMessage.set(null)
    importSummary.set(null)
    importFileName.set(file.name)
    importFormat.set(file.name.toLowerCase().endsWith(".csv") ? "csv" : "json")

    const reader = new FileReader()
    reader.onerror = () => {
      importFileName.set(null)
      notifyImportProblem(`Could not read the file '${file.name}'. Select the file again or paste its content below.`)
    }
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text !== "string" || text.length === 0) {
        importFileName.set(null)
        notifyImportProblem(`The file '${file.name}' is empty. Choose a Bitwarden JSON or CSV export file.`)
        return
      }
      importContent.set(text)
    }
    reader.readAsText(file)
  }

  const handleImport = async (e: Event) => {
    e.preventDefault()
    importValidationMessage.set(null)
    importSummary.set(null)

    const content = importContent.get().trim()
    if (content.length === 0) {
      notifyImportProblem("Select a Bitwarden export file or paste its content before importing.")
      return
    }

    isImporting.set(true)
    const result = await vaultImportExecute({
      session: props.session,
      rawContent: content,
      format: importFormat.get(),
      password: importFilePassword.get() || importMasterPassword.get() || undefined,
      apiClient,
    })
    isImporting.set(false)

    if (!result.success) {
      notifyImportProblem(result.errorMessage)
      return
    }

    importContent.set("")
    importFileName.set(null)
    importFilePassword.set("")
    importMasterPassword.set("")
    importSummary.set({
      cipherCount: result.data.cipherCount,
      folderCount: result.data.folderCount,
      warnings: [...result.data.warnings],
    })
    props.onNotifySuccess?.(
      `Import complete: added ${result.data.cipherCount} items and ${result.data.folderCount} folders to your existing vault.`,
    )
  }

  const handleExport = async (e: Event) => {
    e.preventDefault()
    exportValidationMessage.set(null)

    if (exportFormat.get() === "json-encrypted") {
      if (exportFilePassword.get().length === 0) {
        notifyExportProblem("Enter a file password to protect the encrypted export.")
        return
      }
      if (exportFilePassword.get() !== exportFilePasswordConfirm.get()) {
        notifyExportProblem("The file password and its confirmation do not match.")
        return
      }
    }

    isExporting.set(true)
    const result = await vaultExportExecute({
      session: props.session,
      format: exportFormat.get(),
      password:
        exportFormat.get() === "json-encrypted" ? exportFilePassword.get() : exportMasterPassword.get() || undefined,
      apiClient,
    })
    isExporting.set(false)

    if (!result.success) {
      notifyExportProblem(result.errorMessage)
      return
    }

    lastExportData.set(result.data.content)

    if (typeof window === "undefined" || typeof document === "undefined") {
      props.onNotifySuccess?.(`Vault exported successfully (${result.data.filename}).`)
      return
    }

    let objectUrl: string | null = null
    try {
      const blob = new Blob([result.data.content], { type: result.data.mimeType })
      objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = result.data.filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    } catch {
      notifyExportProblem(
        `The export was created but the download of '${result.data.filename}' failed. Use "Copy to Clipboard" instead.`,
      )
      return
    } finally {
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }

    props.onNotifySuccess?.(`Vault exported successfully (${result.data.filename}).`)
  }

  const handleCopyExport = async () => {
    const data = lastExportData.get()
    if (!data) return
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      notifyExportProblem("Clipboard access is unavailable in this browser. Download the export file instead.")
      return
    }
    try {
      await navigator.clipboard.writeText(data)
    } catch {
      notifyExportProblem("Clipboard access was denied. Download the export file instead.")
      return
    }
    props.onNotifySuccess?.("Exported data copied to clipboard.")
  }

  return {
    subTab: subTab.get,
    setSubTab: subTab.set,

    // Import
    importFormat: importFormat.get,
    setImportFormat,
    importContent: importContent.get,
    setImportContent,
    importFileName: importFileName.get,
    importFilePassword: importFilePassword.get,
    setImportFilePassword,
    importMasterPassword: importMasterPassword.get,
    setImportMasterPassword,
    isImporting: isImporting.get,
    importValidationMessage: importValidationMessage.get,
    importSummary: importSummary.get,
    canSubmitImport,
    handleFileUpload,
    handleImport,

    // Export
    exportFormat: exportFormat.get,
    setExportFormat,
    exportFilePassword: exportFilePassword.get,
    setExportFilePassword,
    exportFilePasswordConfirm: exportFilePasswordConfirm.get,
    setExportFilePasswordConfirm,
    exportMasterPassword: exportMasterPassword.get,
    setExportMasterPassword,
    exportPasswordMismatch,
    canSubmitExport,
    isExporting: isExporting.get,
    exportValidationMessage: exportValidationMessage.get,
    lastExportData: lastExportData.get,
    handleExport,
    handleCopyExport,
  }
}
