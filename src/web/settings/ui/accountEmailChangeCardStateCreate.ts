import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { accountEmailChangeComplete, accountEmailChangeRequestToken } from "../model/accountEmailChangeExecute.js"
import { webSettingsApiClientCreate } from "../model/webSettingsApiClientCreate.js"

export interface AccountEmailChangeCardProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
  onNotifySuccess?: (message: string) => void
  onNotifyError?: (message: string) => void
}

export function accountEmailChangeCardStateCreate(props: AccountEmailChangeCardProps) {
  const apiClient = props.apiClient ?? webSettingsApiClientCreate()

  const currentEmail = () => props.session.session()?.email ?? ""

  const newEmailInput = createSignalObject("")
  const masterPasswordInput = createSignalObject("")
  const tokenInput = createSignalObject("")
  const step = createSignalObject<1 | 2>(1)
  const isRequestingToken = createSignalObject(false)
  const isCompletingChange = createSignalObject(false)

  const handleRequestToken = async (e: Event) => {
    e.preventDefault()
    if (newEmailInput.get().trim().length === 0) {
      props.onNotifyError?.("New email address is required.")
      return
    }
    if (masterPasswordInput.get().length === 0) {
      props.onNotifyError?.("Master password is required.")
      return
    }

    isRequestingToken.set(true)
    const result = await accountEmailChangeRequestToken({
      session: props.session,
      currentPassword: masterPasswordInput.get(),
      newEmail: newEmailInput.get().trim(),
      apiClient,
    })
    isRequestingToken.set(false)

    if (result.success) {
      step.set(2)
      props.onNotifySuccess?.("Verification token sent! Check the inbox of your new email address.")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleCompleteChange = async (e: Event) => {
    e.preventDefault()
    if (tokenInput.get().trim().length === 0) {
      props.onNotifyError?.("Verification token is required.")
      return
    }
    if (masterPasswordInput.get().length === 0) {
      props.onNotifyError?.("Master password is required.")
      return
    }

    isCompletingChange.set(true)
    const result = await accountEmailChangeComplete({
      session: props.session,
      currentPassword: masterPasswordInput.get(),
      newEmail: newEmailInput.get().trim(),
      token: tokenInput.get().trim(),
      apiClient,
    })
    isCompletingChange.set(false)

    if (result.success) {
      step.set(1)
      newEmailInput.set("")
      masterPasswordInput.set("")
      tokenInput.set("")
      props.onNotifySuccess?.("Email address changed successfully! Please log in with your new email.")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleReset = () => {
    step.set(1)
    tokenInput.set("")
  }

  return {
    currentEmail,
    step: step.get,
    newEmailInput: newEmailInput.get,
    setNewEmailInput: newEmailInput.set,
    masterPasswordInput: masterPasswordInput.get,
    setMasterPasswordInput: masterPasswordInput.set,
    tokenInput: tokenInput.get,
    setTokenInput: tokenInput.set,
    isRequestingToken: isRequestingToken.get,
    isCompletingChange: isCompletingChange.get,
    handleRequestToken,
    handleCompleteChange,
    handleReset,
  }
}
