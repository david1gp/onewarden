import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webEmergencyAccessApiClientCreate } from "../model/webEmergencyAccessApiClientCreate.js"

export interface EmergencyAccessInviteDialogProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webEmergencyAccessApiClientCreate>
  isOpen: () => boolean
  onClose: () => void
  onInvited: () => void
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function emergencyAccessInviteDialogStateCreate(props: EmergencyAccessInviteDialogProps) {
  const apiClient = props.apiClient ?? webEmergencyAccessApiClientCreate()

  const email = createSignalObject("")
  const accessType = createSignalObject<0 | 1>(0) // 0: View, 1: Takeover
  const waitTimeDays = createSignalObject(3)
  const isSubmitting = createSignalObject(false)

  const resetForm = () => {
    email.set("")
    accessType.set(0)
    waitTimeDays.set(3)
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const sessionData = props.session.session()
    if (sessionData === null) return

    const trimmedEmail = email.get().trim().toLowerCase()
    if (!trimmedEmail) {
      props.onNotifyError?.("Email is required.")
      return
    }

    isSubmitting.set(true)
    const result = await apiClient.invite(sessionData.accessToken, {
      email: trimmedEmail,
      type: accessType.get(),
      waitTimeDays: waitTimeDays.get(),
    })
    isSubmitting.set(false)

    if (result.success) {
      props.onNotifySuccess?.(`Emergency access invitation sent to ${trimmedEmail}.`)
      resetForm()
      props.onClose()
      props.onInvited()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    email: email.get,
    setEmail: email.set,
    accessType: accessType.get,
    setAccessType: accessType.set,
    waitTimeDays: waitTimeDays.get,
    setWaitTimeDays: waitTimeDays.set,
    isSubmitting: isSubmitting.get,
    handleSubmit,
    handleClose: props.onClose,
  }
}
