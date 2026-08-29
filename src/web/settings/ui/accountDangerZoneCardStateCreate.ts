import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webSettingsApiClientCreate } from "../model/webSettingsApiClientCreate.js"

export interface AccountDangerZoneCardProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
  onNotifySuccess?: (message: string) => void
  onNotifyError?: (message: string) => void
  onAccountDeleted?: () => void
}

export function accountDangerZoneCardStateCreate(props: AccountDangerZoneCardProps) {
  const apiClient = props.apiClient ?? webSettingsApiClientCreate()

  const isDeleteDialogOpen = createSignalObject(false)
  const masterPasswordInput = createSignalObject("")
  const otpInput = createSignalObject("")
  const confirmationText = createSignalObject("")
  const isDeleting = createSignalObject(false)

  // Recovery email deletion state
  const isRecoveryMode = createSignalObject(false)
  const recoveryEmailInput = createSignalObject("")
  const isSendingRecovery = createSignalObject(false)

  const openDeleteDialog = () => {
    masterPasswordInput.set("")
    otpInput.set("")
    confirmationText.set("")
    isDeleteDialogOpen.set(true)
  }

  const closeDeleteDialog = () => {
    isDeleteDialogOpen.set(false)
    masterPasswordInput.set("")
    otpInput.set("")
    confirmationText.set("")
  }

  const handleDeleteAccount = async () => {
    const sessionData = props.session.session()
    if (sessionData === null) return

    if (confirmationText.get().trim().toLowerCase() !== "delete my account") {
      props.onNotifyError?.("Please type 'delete my account' to confirm.")
      return
    }

    if (masterPasswordInput.get().length === 0) {
      props.onNotifyError?.("Master password is required.")
      return
    }

    isDeleting.set(true)
    const hashResult = await props.session.masterPasswordHashDeriveForSession(masterPasswordInput.get())
    if (!hashResult.success) {
      isDeleting.set(false)
      props.onNotifyError?.(hashResult.errorMessage)
      return
    }

    const result = await apiClient.accountDelete(sessionData.accessToken, {
      masterPasswordHash: hashResult.data,
      otp: otpInput.get().trim() || null,
    })
    isDeleting.set(false)

    if (result.success) {
      closeDeleteDialog()
      props.session.logout()
      props.onNotifySuccess?.("Your account has been permanently deleted.")
      props.onAccountDeleted?.()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleSendRecoveryDelete = async (e: Event) => {
    e.preventDefault()
    const email = recoveryEmailInput.get().trim()
    if (email.length === 0) {
      props.onNotifyError?.("Email address is required.")
      return
    }

    isSendingRecovery.set(true)
    const result = await apiClient.accountDeleteRecover(email)
    isSendingRecovery.set(false)

    if (result.success) {
      props.onNotifySuccess?.("Account deletion recovery email sent! Check your inbox to complete deletion.")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    isDeleteDialogOpen: isDeleteDialogOpen.get,
    openDeleteDialog,
    closeDeleteDialog,
    masterPasswordInput: masterPasswordInput.get,
    setMasterPasswordInput: masterPasswordInput.set,
    otpInput: otpInput.get,
    setOtpInput: otpInput.set,
    confirmationText: confirmationText.get,
    setConfirmationText: confirmationText.set,
    isDeleting: isDeleting.get,
    handleDeleteAccount,

    isRecoveryMode: isRecoveryMode.get,
    setIsRecoveryMode: isRecoveryMode.set,
    recoveryEmailInput: recoveryEmailInput.get,
    setRecoveryEmailInput: recoveryEmailInput.set,
    isSendingRecovery: isSendingRecovery.get,
    handleSendRecoveryDelete,
  }
}
