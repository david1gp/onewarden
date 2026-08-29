import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { EmergencyAccessContact } from "../model/emergencyAccessSchema.js"
import { webEmergencyAccessApiClientCreate } from "../model/webEmergencyAccessApiClientCreate.js"

export interface EmergencyAccessVaultViewDialogProps {
  session: ReturnType<typeof webAuthSessionCreate>
  contact: () => EmergencyAccessContact | null
  isOpen: () => boolean
  apiClient?: ReturnType<typeof webEmergencyAccessApiClientCreate>
  onClose: () => void
  onNotifyError?: (msg: string) => void
}

export function emergencyAccessVaultViewDialogStateCreate(props: EmergencyAccessVaultViewDialogProps) {
  const apiClient = props.apiClient ?? webEmergencyAccessApiClientCreate()

  const items = createSignalObject<Record<string, unknown>[]>([])
  const isLoading = createSignalObject(true)
  const errorMessage = createSignalObject<string | null>(null)

  const loadVaultItems = async () => {
    const currentContact = props.contact()
    const sessionData = props.session.session()
    if (currentContact === null || sessionData === null) return

    isLoading.set(true)
    errorMessage.set(null)

    const result = await apiClient.view(sessionData.accessToken, currentContact.id)
    isLoading.set(false)

    if (result.success) {
      items.set(result.data)
    } else {
      errorMessage.set(result.errorMessage)
      props.onNotifyError?.(result.errorMessage)
    }
  }

  onMount(() => {
    if (props.isOpen()) {
      loadVaultItems()
    }
  })

  return {
    items: items.get,
    isLoading: isLoading.get,
    errorMessage: errorMessage.get,
    loadVaultItems,
    handleClose: props.onClose,
  }
}
