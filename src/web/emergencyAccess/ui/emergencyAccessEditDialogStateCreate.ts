import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { EmergencyAccessContact } from "../model/emergencyAccessSchema.js"
import { webEmergencyAccessApiClientCreate } from "../model/webEmergencyAccessApiClientCreate.js"

export interface EmergencyAccessEditDialogProps {
  session: ReturnType<typeof webAuthSessionCreate>
  contact: () => EmergencyAccessContact | null
  isOpen: () => boolean
  apiClient?: ReturnType<typeof webEmergencyAccessApiClientCreate>
  onClose: () => void
  onUpdated: () => void
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function emergencyAccessEditDialogStateCreate(props: EmergencyAccessEditDialogProps) {
  const apiClient = props.apiClient ?? webEmergencyAccessApiClientCreate()

  const accessType = createSignalObject<0 | 1>(0)
  const waitTimeDays = createSignalObject(3)
  const isSubmitting = createSignalObject(false)

  const syncFromContact = (item: EmergencyAccessContact | null) => {
    if (item === null) return
    accessType.set(item.type)
    waitTimeDays.set(item.waitTimeDays)
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const currentContact = props.contact()
    const sessionData = props.session.session()
    if (currentContact === null || sessionData === null) return

    isSubmitting.set(true)
    const result = await apiClient.update(sessionData.accessToken, currentContact.id, {
      type: accessType.get(),
      waitTimeDays: waitTimeDays.get(),
    })
    isSubmitting.set(false)

    if (result.success) {
      props.onNotifySuccess?.("Emergency contact updated successfully.")
      props.onClose()
      props.onUpdated()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    syncFromContact,
    accessType: accessType.get,
    setAccessType: accessType.set,
    waitTimeDays: waitTimeDays.get,
    setWaitTimeDays: waitTimeDays.set,
    isSubmitting: isSubmitting.get,
    handleSubmit,
    handleClose: props.onClose,
  }
}
