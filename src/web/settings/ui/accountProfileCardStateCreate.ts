import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { AccountApiKey } from "../model/accountApiKeySchema.js"
import type { AccountProfile } from "../model/accountProfileSchema.js"
import { webSettingsApiClientCreate } from "../model/webSettingsApiClientCreate.js"

export interface AccountProfileCardProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
  onNotifySuccess?: (message: string) => void
  onNotifyError?: (message: string) => void
}

export function accountProfileCardStateCreate(props: AccountProfileCardProps) {
  const apiClient = props.apiClient ?? webSettingsApiClientCreate()

  const profile = createSignalObject<AccountProfile | null>(null)
  const isLoading = createSignalObject(false)
  const isSaving = createSignalObject(false)
  const isSendingVerification = createSignalObject(false)

  const nameInput = createSignalObject("")
  const avatarColorInput = createSignalObject("#1d4ed8")

  // API Key dialog state
  const isApiKeyDialogOpen = createSignalObject(false)
  const apiKeyPasswordInput = createSignalObject("")
  const apiKeyData = createSignalObject<AccountApiKey | null>(null)
  const isApiKeyLoading = createSignalObject(false)
  const apiKeyError = createSignalObject<string | null>(null)

  const loadProfile = async () => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isLoading.set(true)
    const result = await apiClient.profileGet(sessionData.accessToken)
    isLoading.set(false)
    if (result.success) {
      profile.set(result.data)
      nameInput.set(result.data.name ?? "")
      avatarColorInput.set(result.data.avatarColor ?? "#1d4ed8")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  onMount(() => {
    loadProfile()
  })

  const handleSaveProfile = async (e: Event) => {
    e.preventDefault()
    const sessionData = props.session.session()
    if (sessionData === null) return

    const trimmedName = nameInput.get().trim()
    if (trimmedName.length > 50) {
      props.onNotifyError?.("Name must be 50 characters or fewer.")
      return
    }

    isSaving.set(true)
    const updateResult = await apiClient.profileUpdate(sessionData.accessToken, {
      name: trimmedName,
    })

    if (!updateResult.success) {
      isSaving.set(false)
      props.onNotifyError?.(updateResult.errorMessage)
      return
    }

    const avatarResult = await apiClient.avatarUpdate(sessionData.accessToken, avatarColorInput.get().trim() || null)
    isSaving.set(false)

    if (avatarResult.success) {
      profile.set(avatarResult.data)
      props.onNotifySuccess?.("Profile updated successfully.")
    } else {
      props.onNotifyError?.(avatarResult.errorMessage)
    }
  }

  const handleSendVerificationEmail = async () => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isSendingVerification.set(true)
    const result = await apiClient.emailVerificationSend(sessionData.accessToken)
    isSendingVerification.set(false)
    if (result.success) {
      props.onNotifySuccess?.("Verification email sent! Check your inbox.")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const openApiKeyDialog = () => {
    apiKeyPasswordInput.set("")
    apiKeyData.set(null)
    apiKeyError.set(null)
    isApiKeyDialogOpen.set(true)
  }

  const closeApiKeyDialog = () => {
    isApiKeyDialogOpen.set(false)
    apiKeyPasswordInput.set("")
  }

  const handleFetchApiKey = async (rotate = false) => {
    const sessionData = props.session.session()
    if (sessionData === null) return

    const password = apiKeyPasswordInput.get()
    if (password.length === 0) {
      apiKeyError.set("Master password is required.")
      return
    }

    isApiKeyLoading.set(true)
    apiKeyError.set(null)

    const hashResult = await props.session.masterPasswordHashDeriveForSession(password)
    if (!hashResult.success) {
      isApiKeyLoading.set(false)
      apiKeyError.set(hashResult.errorMessage)
      return
    }

    const result = rotate
      ? await apiClient.apiKeyRotate(sessionData.accessToken, hashResult.data)
      : await apiClient.apiKeyGet(sessionData.accessToken, hashResult.data)

    isApiKeyLoading.set(false)
    if (result.success) {
      apiKeyData.set(result.data)
      if (rotate) {
        props.onNotifySuccess?.("API key rotated successfully.")
      }
    } else {
      apiKeyError.set(result.errorMessage)
    }
  }

  return {
    profile: profile.get,
    isLoading: isLoading.get,
    isSaving: isSaving.get,
    isSendingVerification: isSendingVerification.get,
    nameInput: nameInput.get,
    setNameInput: nameInput.set,
    avatarColorInput: avatarColorInput.get,
    setAvatarColorInput: avatarColorInput.set,
    handleSaveProfile,
    handleSendVerificationEmail,
    // API key dialog
    isApiKeyDialogOpen: isApiKeyDialogOpen.get,
    openApiKeyDialog,
    closeApiKeyDialog,
    apiKeyPasswordInput: apiKeyPasswordInput.get,
    setApiKeyPasswordInput: apiKeyPasswordInput.set,
    apiKeyData: apiKeyData.get,
    isApiKeyLoading: isApiKeyLoading.get,
    apiKeyError: apiKeyError.get,
    handleFetchApiKey,
  }
}
