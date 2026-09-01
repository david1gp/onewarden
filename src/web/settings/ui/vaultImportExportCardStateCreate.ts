import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { organizationApiClientCreate } from "../../organizations/api/organizationApiClientCreate.js"
import { bitwardenOrganizationCsvExportExecute } from "../../organizations/model/bitwardenOrganizationCsvExportExecute.js"
import { bitwardenOrganizationCsvImportExecute } from "../../organizations/model/bitwardenOrganizationCsvImportExecute.js"
import { bitwardenOrganizationJsonExportExecute } from "../../organizations/model/bitwardenOrganizationJsonExportExecute.js"
import { bitwardenOrganizationJsonImportExecute } from "../../organizations/model/bitwardenOrganizationJsonImportExecute.js"
import { vaultExportExecute } from "../model/vaultExportExecute.js"
import type { VaultExportFormat } from "../model/vaultExportSchema.js"
import { vaultImportExecute } from "../model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../model/webSettingsApiClientCreate.js"
import { webSettingsOrganizationCreate } from "../model/webSettingsOrganizationCreate.js"

export type VaultImportExportScope = "personal" | "organization"

export interface VaultImportExportOrganizationOption {
  id: string
  name: string
}

export interface VaultImportExportCardProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
  organizationApiClient?: ReturnType<typeof organizationApiClientCreate>
  onNotifySuccess?: (message: string) => void
  onNotifyError?: (message: string) => void
}

export interface VaultImportSummary {
  cipherCount: number
  folderCount: number
  collectionCount: number
  warnings: string[]
}

export interface VaultExportSummary {
  filename: string
  cipherCount: number | null
  collectionCount: number | null
  skippedCount: number
  warnings: string[]
}

const personalExportFormats: VaultExportFormat[] = [
  "json-decrypted",
  "csv-decrypted",
  "json-encrypted",
  "json-account-encrypted",
  "zip",
]
const organizationExportFormats: VaultExportFormat[] = ["json-decrypted", "csv-decrypted"]

export function vaultImportExportCardStateCreate(props: VaultImportExportCardProps) {
  const apiClient = props.apiClient ?? webSettingsApiClientCreate()
  const organizationApiClient = props.organizationApiClient
  const organizationHelper = webSettingsOrganizationCreate({
    apiClient: organizationApiClient,
    session: props.session,
  })

  const subTab = createSignalObject<"import" | "export">("import")

  // Organization selection state
  const organizations = createSignalObject<VaultImportExportOrganizationOption[]>([])
  const organizationId = createSignalObject<string | null>(null)
  const isLoadingOrganizations = createSignalObject(false)

  // Import state
  const importScope = createSignalObject<VaultImportExportScope>("personal")
  const importFormat = createSignalObject<"json" | "csv">("json")
  const importContent = createSignalObject("")
  const importFileName = createSignalObject<string | null>(null)
  const importFilePassword = createSignalObject("")
  const importMasterPassword = createSignalObject("")
  const isImporting = createSignalObject(false)
  const importValidationMessage = createSignalObject<string | null>(null)
  const importSummary = createSignalObject<VaultImportSummary | null>(null)

  // Export state
  const exportScope = createSignalObject<VaultImportExportScope>("personal")
  const exportFormat = createSignalObject<VaultExportFormat>("json-decrypted")
  const exportFilePassword = createSignalObject("")
  const exportFilePasswordConfirm = createSignalObject("")
  const exportMasterPassword = createSignalObject("")
  const isExporting = createSignalObject(false)
  const exportValidationMessage = createSignalObject<string | null>(null)
  const exportSummary = createSignalObject<VaultExportSummary | null>(null)
  const lastExportData = createSignalObject<string | null>(null)

  const notifyImportProblem = (message: string) => {
    importValidationMessage.set(message)
    props.onNotifyError?.(message)
  }

  const notifyExportProblem = (message: string) => {
    exportValidationMessage.set(message)
    props.onNotifyError?.(message)
  }

  const notifyOrganizationProblem = (message: string) => {
    const isImportTab = subTab.get() === "import"
    importValidationMessage.set(isImportTab ? message : null)
    exportValidationMessage.set(isImportTab ? null : message)
    props.onNotifyError?.(message)
  }

  let organizationsLoadPending: Promise<void> | null = null

  const organizationsFetch = async () => {
    isLoadingOrganizations.set(true)
    const result = await organizationHelper.organizationList()
    isLoadingOrganizations.set(false)

    if (!result.success) {
      organizations.set([])
      organizationId.set(null)
      notifyOrganizationProblem(result.errorMessage)
      return
    }

    const options = result.data.map((organization) => ({ id: organization.id, name: organization.name }))
    organizations.set(options)
    const selected = organizationId.get()
    if (selected === null || !options.some((option) => option.id === selected)) {
      organizationId.set(options[0]?.id ?? null)
    }
  }

  const organizationsLoad = async (): Promise<void> => {
    if (organizationsLoadPending !== null) return organizationsLoadPending
    const pending = organizationsFetch()
    organizationsLoadPending = pending
    try {
      await pending
    } finally {
      organizationsLoadPending = null
    }
  }

  const setOrganizationId = (id: string | null) => {
    organizationId.set(id)
    importValidationMessage.set(null)
    exportValidationMessage.set(null)
  }

  const setImportScope = (scope: VaultImportExportScope) => {
    if (importScope.get() === scope) return
    importScope.set(scope)
    importValidationMessage.set(null)
    importSummary.set(null)
    importFilePassword.set("")
    if (scope === "organization") {
      importMasterPassword.set("")
      void organizationsLoad()
    }
  }

  const setExportScope = (scope: VaultImportExportScope) => {
    if (exportScope.get() === scope) return
    exportScope.set(scope)
    exportValidationMessage.set(null)
    exportSummary.set(null)
    lastExportData.set(null)
    exportFilePassword.set("")
    exportFilePasswordConfirm.set("")
    if (scope === "organization") {
      exportMasterPassword.set("")
      if (!organizationExportFormats.includes(exportFormat.get())) exportFormat.set("json-decrypted")
      void organizationsLoad()
    }
  }

  const exportFormatOptions = (): VaultExportFormat[] =>
    exportScope.get() === "organization" ? organizationExportFormats : personalExportFormats

  const setImportFormat = (format: "json" | "csv") => {
    importFormat.set(format)
    importValidationMessage.set(null)
    if (format === "csv") importFilePassword.set("")
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
    if (!exportFormatOptions().includes(format)) {
      notifyExportProblem("The selected export format is not available for this scope.")
      return
    }
    exportFormat.set(format)
    exportValidationMessage.set(null)
    exportSummary.set(null)
    lastExportData.set(null)
    if (format !== "json-encrypted") {
      exportFilePassword.set("")
      exportFilePasswordConfirm.set("")
    }
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
    if (exportScope.get() === "organization" && !organizationId.get()) return false
    if (exportFormat.get() !== "json-encrypted") return true
    if (exportFilePassword.get().length === 0) return false
    return exportFilePassword.get() === exportFilePasswordConfirm.get()
  }

  const canSubmitImport = () => {
    if (isImporting.get()) return false
    if (importScope.get() === "organization" && !organizationId.get()) return false
    return importContent.get().trim().length > 0
  }

  const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    importValidationMessage.set(null)
    importSummary.set(null)
    importFileName.set(file.name)
    setImportFormat(file.name.toLowerCase().endsWith(".csv") ? "csv" : "json")

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

  const organizationImportRun = async (content: string, selectedOrganizationId: string) => {
    const keyResult = await organizationHelper.organizationKeyResolve(selectedOrganizationId)
    if (!keyResult.success) return keyResult
    const organizationKey = keyResult.data
    try {
      const importOptions = {
        apiClient: organizationApiClient,
        organizationId: selectedOrganizationId,
        organizationKey,
        rawContent: content,
        session: props.session,
      }
      return importFormat.get() === "csv"
        ? await bitwardenOrganizationCsvImportExecute(importOptions)
        : await bitwardenOrganizationJsonImportExecute(importOptions)
    } finally {
      organizationKey.fill(0)
    }
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

    const selectedOrganizationId = organizationId.get()
    if (importScope.get() === "organization" && !selectedOrganizationId) {
      notifyImportProblem("Select an organization before importing organization data.")
      return
    }

    isImporting.set(true)
    const result =
      importScope.get() === "organization" && selectedOrganizationId
        ? await organizationImportRun(content, selectedOrganizationId)
        : await vaultImportExecute({
            session: props.session,
            rawContent: content,
            format: importFormat.get(),
            filePassword: importFilePassword.get() || undefined,
            masterPassword: importMasterPassword.get() || undefined,
            apiClient,
          })
    isImporting.set(false)

    if (!result.success) {
      notifyImportProblem(result.errorMessage)
      return
    }

    const cipherCount = result.data.cipherCount
    const folderCount = "folderCount" in result.data ? result.data.folderCount : 0
    const collectionCount = "collectionCount" in result.data ? result.data.collectionCount : 0

    importContent.set("")
    importFileName.set(null)
    importFilePassword.set("")
    importMasterPassword.set("")
    importSummary.set({
      cipherCount,
      folderCount,
      collectionCount,
      warnings: [...result.data.warnings],
    })
    props.onNotifySuccess?.(
      importScope.get() === "organization"
        ? `Import complete: added ${cipherCount} items and ${collectionCount} collections to the organization.`
        : `Import complete: added ${cipherCount} items and ${folderCount} folders to your existing vault.`,
    )
  }

  const organizationExportRun = async (selectedOrganizationId: string) => {
    const keyResult = await organizationHelper.organizationKeyResolve(selectedOrganizationId)
    if (!keyResult.success) return keyResult
    const organizationKey = keyResult.data
    try {
      const exportOptions = {
        apiClient: organizationApiClient,
        organizationId: selectedOrganizationId,
        organizationKey,
        session: props.session,
      }
      return exportFormat.get() === "csv-decrypted"
        ? await bitwardenOrganizationCsvExportExecute(exportOptions)
        : await bitwardenOrganizationJsonExportExecute(exportOptions)
    } finally {
      organizationKey.fill(0)
    }
  }

  const handleExport = async (e: Event) => {
    e.preventDefault()
    exportValidationMessage.set(null)
    exportSummary.set(null)

    const selectedOrganizationId = organizationId.get()
    if (exportScope.get() === "organization" && !selectedOrganizationId) {
      notifyExportProblem("Select an organization before exporting organization data.")
      return
    }

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
    const result =
      exportScope.get() === "organization" && selectedOrganizationId
        ? await organizationExportRun(selectedOrganizationId)
        : await vaultExportExecute({
            session: props.session,
            format: exportFormat.get(),
            password: exportFormat.get() === "json-encrypted" ? exportFilePassword.get() : undefined,
            masterPassword: exportMasterPassword.get() || undefined,
            apiClient,
          })
    isExporting.set(false)

    if (!result.success) {
      notifyExportProblem(result.errorMessage)
      return
    }

    const data = result.data as {
      cipherCount?: number
      collectionCount?: number
      content: string | Uint8Array
      filename: string
      mimeType: string
      skippedAttachmentCount?: number
      skippedCipherCount?: number
      warnings?: string[]
    }
    const content = data.content
    const filename = data.filename
    lastExportData.set(typeof content === "string" ? content : null)
    exportSummary.set({
      filename,
      cipherCount: data.cipherCount ?? null,
      collectionCount: data.collectionCount ?? null,
      skippedCount: data.skippedAttachmentCount ?? data.skippedCipherCount ?? 0,
      warnings: [...(data.warnings ?? [])],
    })

    if (typeof window === "undefined" || typeof document === "undefined") {
      props.onNotifySuccess?.(`Vault exported successfully (${filename}).`)
      return
    }

    let objectUrl: string | null = null
    try {
      const blob =
        typeof content === "string"
          ? new Blob([content], { type: data.mimeType })
          : new Blob([content.slice().buffer as ArrayBuffer], { type: data.mimeType })
      objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    } catch {
      notifyExportProblem(
        typeof content === "string"
          ? `The export was created but the download of '${filename}' failed. Use "Copy to Clipboard" instead.`
          : `The export was created but the download of '${filename}' failed. Try exporting again.`,
      )
      return
    } finally {
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }

    props.onNotifySuccess?.(`Vault exported successfully (${filename}).`)
  }

  const canCopyExport = () => exportFormat.get() !== "zip" && lastExportData.get() !== null

  const handleCopyExport = async () => {
    const data = lastExportData.get()
    if (!data || !canCopyExport()) return
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

    // Organizations
    organizations: organizations.get,
    organizationId: organizationId.get,
    setOrganizationId,
    isLoadingOrganizations: isLoadingOrganizations.get,
    organizationsLoad,

    // Import
    importScope: importScope.get,
    setImportScope,
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
    exportScope: exportScope.get,
    setExportScope,
    exportFormat: exportFormat.get,
    exportFormatOptions,
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
    exportSummary: exportSummary.get,
    lastExportData: lastExportData.get,
    canCopyExport,
    handleExport,
    handleCopyExport,
  }
}
