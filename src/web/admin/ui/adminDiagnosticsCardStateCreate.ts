import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminDiagnostics } from "../model/adminDiagnosticsSchema.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export interface AdminDiagnosticsCardProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onNotifyError?: (msg: string) => void
}

export function adminDiagnosticsCardStateCreate(props: AdminDiagnosticsCardProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const diagnostics = createSignalObject<AdminDiagnostics | null>(null)
  const isLoading = createSignalObject(false)

  const loadDiagnostics = async () => {
    isLoading.set(true)
    const result = await apiClient.diagnosticsGet()
    isLoading.set(false)

    if (result.success) {
      diagnostics.set(result.data)
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  onMount(() => {
    loadDiagnostics()
  })

  return {
    diagnostics: diagnostics.get,
    isLoading: isLoading.get,
    loadDiagnostics,
  }
}
