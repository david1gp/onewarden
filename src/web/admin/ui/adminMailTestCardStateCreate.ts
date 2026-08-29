import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export interface AdminMailTestCardProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function adminMailTestCardStateCreate(props: AdminMailTestCardProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const emailInput = createSignalObject("")
  const isSending = createSignalObject(false)

  const handleSendTestMail = async (e: Event) => {
    e.preventDefault()
    const email = emailInput.get().trim().toLowerCase()
    if (!email) {
      props.onNotifyError?.("Target email address is required.")
      return
    }

    isSending.set(true)
    const result = await apiClient.smtpTest(email)
    isSending.set(false)

    if (result.success) {
      props.onNotifySuccess?.(`Test email sent successfully to ${email}.`)
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    emailInput: emailInput.get,
    setEmailInput: emailInput.set,
    isSending: isSending.get,
    handleSendTestMail,
  }
}
