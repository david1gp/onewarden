import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { bitwardenCipherStringDecrypt } from "../../../shared/crypto/bitwardenCipherStringDecrypt.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { SendItem } from "../model/sendItemSchema.js"
import { webSendApiClientCreate } from "../model/webSendApiClientCreate.js"

export type SendFilterTab = "all" | "text" | "file" | "active" | "expired"

export interface SendListViewProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSendApiClientCreate>
  onNavigateToVault?: () => void
  onNavigateToSendAccess?: (accessId: string) => void
}

export function sendListViewStateCreate(props: SendListViewProps) {
  const apiClient = props.apiClient ?? webSendApiClientCreate()

  const sends = createSignalObject<SendItem[]>([])
  const isLoading = createSignalObject(false)
  const searchQuery = createSignalObject("")
  const activeTab = createSignalObject<SendFilterTab>("all")
  const successMessage = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)

  // Dialog states
  const isCreateOpen = createSignalObject(false)
  const isEditOpen = createSignalObject(false)
  const selectedSendForEdit = createSignalObject<SendItem | null>(null)
  const isDeleting = createSignalObject(false)
  const deleteTargetId = createSignalObject<string | null>(null)

  const notifySuccess = (msg: string) => {
    successMessage.set(msg)
    setTimeout(() => successMessage.set(null), 4000)
  }

  const notifyError = (msg: string) => {
    errorMessage.set(msg)
    setTimeout(() => errorMessage.set(null), 6000)
  }

  const loadSends = async () => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isLoading.set(true)
    const result = await apiClient.sendList(sessionData.accessToken)
    isLoading.set(false)
    if (result.success) {
      sends.set(result.data)
    } else {
      notifyError(result.errorMessage)
    }
  }

  onMount(() => {
    loadSends()
  })

  const filteredSends = () => {
    const query = searchQuery.get().toLowerCase().trim()
    const tab = activeTab.get()
    const now = Date.now()

    return sends.get().filter((item) => {
      // Search check
      if (query) {
        const matchesName = item.name.toLowerCase().includes(query)
        const matchesNotes = item.notes?.toLowerCase().includes(query) ?? false
        if (!matchesName && !matchesNotes) return false
      }

      // Tab check
      if (tab === "text") return item.type === 0
      if (tab === "file") return item.type === 1
      if (tab === "active") {
        if (item.disabled) return false
        if (item.expirationDate && new Date(item.expirationDate).getTime() < now) return false
        if (item.maxAccessCount !== null && item.accessCount >= item.maxAccessCount) return false
        return true
      }
      if (tab === "expired") {
        const isTimeExpired = item.expirationDate !== null && new Date(item.expirationDate).getTime() < now
        const isCountExpired = item.maxAccessCount !== null && item.accessCount >= item.maxAccessCount
        return item.disabled || isTimeExpired || isCountExpired
      }
      return true
    })
  }

  const sendAccessPathResolve = async (item: SendItem): Promise<string | null> => {
    const userKey = props.session.getUserKey()
    if (userKey === null) {
      notifyError("Unlock your vault to open or copy this Send link.")
      return null
    }
    const sendKeyResult = await bitwardenCipherStringDecrypt(item.key ?? "", userKey)
    if (!sendKeyResult.success || sendKeyResult.data.byteLength !== 64) {
      notifyError(sendKeyResult.success ? "Send key has an invalid length." : sendKeyResult.errorMessage)
      return null
    }
    return `/send/${item.accessId}#${base64UrlEncode(sendKeyResult.data)}`
  }

  const handleCopyLink = async (item: SendItem) => {
    const path = await sendAccessPathResolve(item)
    if (path === null) return
    const url = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(url)
      notifySuccess("Send link copied to clipboard!")
    } catch {
      notifyError("Failed to copy link to clipboard.")
    }
  }

  const handleOpenEdit = (item: SendItem) => {
    selectedSendForEdit.set(item)
    isEditOpen.set(true)
  }

  const handleDeleteSend = async (sendId: string) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isDeleting.set(true)
    deleteTargetId.set(sendId)
    const result = await apiClient.sendDelete(sessionData.accessToken, sendId)
    isDeleting.set(false)
    deleteTargetId.set(null)
    if (result.success) {
      notifySuccess("Send deleted successfully.")
      loadSends()
    } else {
      notifyError(result.errorMessage)
    }
  }

  const handleNavigateAccess = async (item: SendItem) => {
    const path = await sendAccessPathResolve(item)
    if (path === null) return
    if (props.onNavigateToSendAccess) {
      props.onNavigateToSendAccess(path.slice("/send/".length))
    } else {
      window.location.href = path
    }
  }

  return {
    sends: filteredSends,
    rawSendsCount: () => sends.get().length,
    isLoading: isLoading.get,
    searchQuery: searchQuery.get,
    setSearchQuery: searchQuery.set,
    activeTab: activeTab.get,
    setActiveTab: activeTab.set,
    successMessage: successMessage.get,
    errorMessage: errorMessage.get,
    isCreateOpen: isCreateOpen.get,
    openCreate: () => isCreateOpen.set(true),
    closeCreate: () => isCreateOpen.set(false),
    isEditOpen: isEditOpen.get,
    selectedSendForEdit: selectedSendForEdit.get,
    closeEdit: () => {
      isEditOpen.set(false)
      selectedSendForEdit.set(null)
    },
    isDeleting: isDeleting.get,
    deleteTargetId: deleteTargetId.get,
    loadSends,
    notifySuccess,
    notifyError,
    handleCopyLink,
    handleOpenEdit,
    handleDeleteSend,
    handleNavigateAccess,
    handleBackToVault: props.onNavigateToVault,
  }
}
