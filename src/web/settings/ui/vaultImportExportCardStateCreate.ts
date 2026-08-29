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

export function vaultImportExportCardStateCreate(props: VaultImportExportCardProps) {
  const apiClient = props.apiClient ?? webSettingsApiClientCreate()

  const subTab = createSignalObject<"import" | "export">("import")

  // Import state
  const importFormat = createSignalObject<"json" | "csv">("json")
  const importContent = createSignalObject("")
  const importPassword = createSignalObject("")
  const isImporting = createSignalObject(false)

  // Export state
  const exportFormat = createSignalObject<VaultExportFormat>("json-decrypted")
  const exportPassword = createSignalObject("")
  const isExporting = createSignalObject(false)
  const lastExportData = createSignalObject<string | null>(null)

  const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const isCsv = file.name.endsWith(".csv")
    if (isCsv) {
      importFormat.set("csv")
    } else {
      importFormat.set("json")
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (text) {
        importContent.set(text)
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async (e: Event) => {
    e.preventDefault()
    const content = importContent.get().trim()
    if (content.length === 0) {
      props.onNotifyError?.("Please select a file or paste vault data.")
      return
    }

    isImporting.set(true)
    const result = await vaultImportExecute({
      session: props.session,
      rawContent: content,
      format: importFormat.get(),
      password: importPassword.get() || undefined,
      apiClient,
    })
    isImporting.set(false)

    if (result.success) {
      importContent.set("")
      importPassword.set("")
      props.onNotifySuccess?.(
        `Import successful! Imported ${result.data.cipherCount} items and ${result.data.folderCount} folders.`,
      )
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleExport = async (e: Event) => {
    e.preventDefault()
    isExporting.set(true)
    const result = await vaultExportExecute({
      session: props.session,
      format: exportFormat.get(),
      password: exportPassword.get() || undefined,
      apiClient,
    })
    isExporting.set(false)

    if (result.success) {
      lastExportData.set(result.data.content)
      props.onNotifySuccess?.(`Vault exported successfully (${result.data.filename}).`)

      // Trigger browser download
      if (typeof window !== "undefined") {
        const blob = new Blob([result.data.content], { type: result.data.mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.data.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleCopyExport = async () => {
    const data = lastExportData.get()
    if (!data) return
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(data)
      props.onNotifySuccess?.("Exported data copied to clipboard.")
    }
  }

  return {
    subTab: subTab.get,
    setSubTab: subTab.set,

    // Import
    importFormat: importFormat.get,
    setImportFormat: importFormat.set,
    importContent: importContent.get,
    setImportContent: importContent.set,
    importPassword: importPassword.get,
    setImportPassword: importPassword.set,
    isImporting: isImporting.get,
    handleFileUpload,
    handleImport,

    // Export
    exportFormat: exportFormat.get,
    setExportFormat: exportFormat.set,
    exportPassword: exportPassword.get,
    setExportPassword: exportPassword.set,
    isExporting: isExporting.get,
    lastExportData: lastExportData.get,
    handleExport,
    handleCopyExport,
  }
}
