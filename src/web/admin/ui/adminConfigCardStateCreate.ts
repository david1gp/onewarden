import { onMount } from "solid-js"
import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { type AdminConfig, adminConfigSchema } from "../model/adminConfigSchema.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export interface AdminConfigCardProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function adminConfigCardStateCreate(props: AdminConfigCardProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const config = createSignalObject<AdminConfig | null>(null)
  const configJsonInput = createSignalObject("")
  const isLoading = createSignalObject(false)
  const isSaving = createSignalObject(false)
  const isDeleting = createSignalObject(false)

  const loadConfig = async () => {
    isLoading.set(true)
    const result = await apiClient.diagnosticsConfigGet()
    isLoading.set(false)

    if (result.success) {
      config.set(result.data)
      configJsonInput.set(JSON.stringify(result.data, null, 2))
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  onMount(() => {
    loadConfig()
  })

  const handleSaveConfig = async (e: Event) => {
    e.preventDefault()
    let parsed: unknown
    try {
      parsed = JSON.parse(configJsonInput.get())
    } catch {
      props.onNotifyError?.("Invalid JSON format in configuration editor.")
      return
    }
    const parsedResult = v.safeParse(adminConfigSchema, parsed)
    if (!parsedResult.success) {
      props.onNotifyError?.("Configuration must be a JSON object.")
      return
    }

    isSaving.set(true)
    const result = await apiClient.configUpdate(parsedResult.output)
    isSaving.set(false)

    if (result.success) {
      props.onNotifySuccess?.("Configuration updated successfully.")
      loadConfig()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleDeleteConfig = async () => {
    if (!window.confirm("Are you sure you want to reset config overrides? This restores environment defaults.")) {
      return
    }

    isDeleting.set(true)
    const result = await apiClient.configDelete()
    isDeleting.set(false)

    if (result.success) {
      props.onNotifySuccess?.("Configuration reset to defaults.")
      loadConfig()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    configJsonInput: configJsonInput.get,
    setConfigJsonInput: configJsonInput.set,
    isLoading: isLoading.get,
    isSaving: isSaving.get,
    isDeleting: isDeleting.get,
    loadConfig,
    handleSaveConfig,
    handleDeleteConfig,
  }
}
