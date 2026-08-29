import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { EmergencyAccessContact } from "../model/emergencyAccessSchema.js"
import { webEmergencyAccessApiClientCreate } from "../model/webEmergencyAccessApiClientCreate.js"

export interface EmergencyAccessTakeoverDialogProps {
  session: ReturnType<typeof webAuthSessionCreate>
  contact: () => EmergencyAccessContact | null
  isOpen: () => boolean
  apiClient?: ReturnType<typeof webEmergencyAccessApiClientCreate>
  onClose: () => void
  onTakeoverComplete: () => void
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function emergencyAccessTakeoverDialogStateCreate(props: EmergencyAccessTakeoverDialogProps) {
  const apiClient = props.apiClient ?? webEmergencyAccessApiClientCreate()

  const newPassword = createSignalObject("")
  const confirmPassword = createSignalObject("")
  const isSubmitting = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const currentContact = props.contact()
    const sessionData = props.session.session()
    if (currentContact === null || sessionData === null) return

    const pwd = newPassword.get()
    const confirmPwd = confirmPassword.get()

    if (pwd.length < 8) {
      errorMessage.set("Master password must be at least 8 characters.")
      return
    }

    if (pwd !== confirmPwd) {
      errorMessage.set("Passwords do not match.")
      return
    }

    isSubmitting.set(true)
    errorMessage.set(null)

    // Derive hash for grantor
    const hashResult = await props.session.masterPasswordHashDeriveForSession(pwd)
    if (!hashResult.success) {
      isSubmitting.set(false)
      errorMessage.set(hashResult.errorMessage)
      return
    }

    // Call takeover endpoint to get user keys/status
    const takeoverResult = await apiClient.takeover(sessionData.accessToken, currentContact.id)
    if (!takeoverResult.success) {
      isSubmitting.set(false)
      errorMessage.set(takeoverResult.errorMessage)
      return
    }

    // Set new password
    const key = currentContact.keyEncrypted ?? "takeover-key"
    const pwdResult = await apiClient.password(sessionData.accessToken, currentContact.id, {
      newMasterPasswordHash: hashResult.data,
      key,
    })

    isSubmitting.set(false)

    if (pwdResult.success) {
      props.onNotifySuccess?.("Takeover complete! New master password has been set for the grantor account.")
      newPassword.set("")
      confirmPassword.set("")
      props.onClose()
      props.onTakeoverComplete()
    } else {
      errorMessage.set(pwdResult.errorMessage)
      props.onNotifyError?.(pwdResult.errorMessage)
    }
  }

  return {
    newPassword: newPassword.get,
    setNewPassword: newPassword.set,
    confirmPassword: confirmPassword.get,
    setConfirmPassword: confirmPassword.set,
    isSubmitting: isSubmitting.get,
    errorMessage: errorMessage.get,
    handleSubmit,
    handleClose: props.onClose,
  }
}
