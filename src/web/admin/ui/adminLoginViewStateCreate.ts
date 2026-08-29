import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export interface AdminLoginViewProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onLoginSuccess: () => void
  onNavigateHome?: () => void
}

export function adminLoginViewStateCreate(props: AdminLoginViewProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const tokenInput = createSignalObject("")
  const isLoading = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const token = tokenInput.get().trim()
    if (!token) {
      errorMessage.set("Admin token is required.")
      return
    }

    isLoading.set(true)
    errorMessage.set(null)

    const result = await apiClient.login(token)
    isLoading.set(false)

    if (result.success) {
      props.onLoginSuccess()
    } else {
      errorMessage.set(result.errorMessage)
    }
  }

  return {
    tokenInput: tokenInput.get,
    setTokenInput: tokenInput.set,
    isLoading: isLoading.get,
    errorMessage: errorMessage.get,
    handleSubmit,
    handleNavigateHome: props.onNavigateHome,
  }
}
