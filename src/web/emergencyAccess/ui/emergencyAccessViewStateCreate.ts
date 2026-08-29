import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { EmergencyAccessContact } from "../model/emergencyAccessSchema.js"
import { webEmergencyAccessApiClientCreate } from "../model/webEmergencyAccessApiClientCreate.js"

export type EmergencyTab = "trusted" | "granted"

export interface EmergencyAccessViewProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webEmergencyAccessApiClientCreate>
  onNavigateToVault?: () => void
}

export function emergencyAccessViewStateCreate(props: EmergencyAccessViewProps) {
  const apiClient = props.apiClient ?? webEmergencyAccessApiClientCreate()

  const currentTab = createSignalObject<EmergencyTab>("trusted")
  const trustedContacts = createSignalObject<EmergencyAccessContact[]>([])
  const grantedVaults = createSignalObject<EmergencyAccessContact[]>([])
  const isLoading = createSignalObject(false)
  const isActionRunning = createSignalObject(false)
  const actionTargetId = createSignalObject<string | null>(null)

  const successMessage = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)

  // Dialogs
  const isInviteOpen = createSignalObject(false)
  const isEditOpen = createSignalObject(false)
  const selectedContactForEdit = createSignalObject<EmergencyAccessContact | null>(null)
  const isVaultViewOpen = createSignalObject(false)
  const selectedContactForVaultView = createSignalObject<EmergencyAccessContact | null>(null)
  const isTakeoverOpen = createSignalObject(false)
  const selectedContactForTakeover = createSignalObject<EmergencyAccessContact | null>(null)

  const notifySuccess = (msg: string) => {
    successMessage.set(msg)
    setTimeout(() => successMessage.set(null), 4000)
  }

  const notifyError = (msg: string) => {
    errorMessage.set(msg)
    setTimeout(() => errorMessage.set(null), 6000)
  }

  const loadData = async () => {
    const sessionData = props.session.session()
    if (sessionData === null) return

    isLoading.set(true)
    const [trustedRes, grantedRes] = await Promise.all([
      apiClient.trustedGet(sessionData.accessToken),
      apiClient.grantedGet(sessionData.accessToken),
    ])
    isLoading.set(false)

    if (trustedRes.success) {
      trustedContacts.set(trustedRes.data)
    } else {
      notifyError(trustedRes.errorMessage)
    }

    if (grantedRes.success) {
      grantedVaults.set(grantedRes.data)
    } else {
      notifyError(grantedRes.errorMessage)
    }
  }

  onMount(() => {
    loadData()
  })

  const statusLabel = (status: number) => {
    if (status === 0) return "Invited"
    if (status === 1) return "Accepted"
    if (status === 2) return "Confirmed"
    if (status === 3) return "Recovery Initiated"
    if (status === 4) return "Recovery Approved"
    return "Unknown"
  }

  const statusBadgeClass = (status: number) => {
    if (status === 0) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    if (status === 1) return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
    if (status === 2) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
    if (status === 3) return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
    if (status === 4) return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  }

  // Grantor actions
  const handleConfirmContact = async (contact: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    actionTargetId.set(contact.id)
    // Send a placeholder or derived key confirmation
    const key = sessionData.encryptedUserKey ?? "confirmed-emergency-key"
    const result = await apiClient.confirm(sessionData.accessToken, contact.id, key)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      notifySuccess(`Confirmed emergency access for ${contact.email}.`)
      loadData()
    } else {
      notifyError(result.errorMessage)
    }
  }

  const handleReinviteContact = async (contact: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    actionTargetId.set(contact.id)
    const result = await apiClient.reinvite(sessionData.accessToken, contact.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      notifySuccess(`Re-sent emergency invitation to ${contact.email}.`)
      loadData()
    } else {
      notifyError(result.errorMessage)
    }
  }

  const handleApproveRecovery = async (contact: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    actionTargetId.set(contact.id)
    const result = await apiClient.approve(sessionData.accessToken, contact.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      notifySuccess(`Approved emergency recovery for ${contact.email}.`)
      loadData()
    } else {
      notifyError(result.errorMessage)
    }
  }

  const handleRejectRecovery = async (contact: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    actionTargetId.set(contact.id)
    const result = await apiClient.reject(sessionData.accessToken, contact.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      notifySuccess(`Rejected emergency recovery request from ${contact.email}.`)
      loadData()
    } else {
      notifyError(result.errorMessage)
    }
  }

  const handleDeleteContact = async (contact: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    actionTargetId.set(contact.id)
    const result = await apiClient.deleteAccess(sessionData.accessToken, contact.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      notifySuccess(`Removed emergency access contact ${contact.email}.`)
      loadData()
    } else {
      notifyError(result.errorMessage)
    }
  }

  // Grantee actions
  const handleAcceptInvite = async (vault: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    const token = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("token")
    if (!token) {
      notifyError("Open the emergency access invitation link from your email to accept this invitation.")
      return
    }
    isActionRunning.set(true)
    actionTargetId.set(vault.id)
    const result = await apiClient.accept(sessionData.accessToken, vault.id, token)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      notifySuccess(`Accepted emergency access invitation from ${vault.email}.`)
      loadData()
    } else {
      notifyError(result.errorMessage)
    }
  }

  const handleInitiateAccess = async (vault: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    actionTargetId.set(vault.id)
    const result = await apiClient.initiate(sessionData.accessToken, vault.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      notifySuccess(`Emergency recovery initiated for ${vault.email}. Waiting period has started.`)
      loadData()
    } else {
      notifyError(result.errorMessage)
    }
  }

  const handleOpenVaultView = (vault: EmergencyAccessContact) => {
    selectedContactForVaultView.set(vault)
    isVaultViewOpen.set(true)
  }

  const handleOpenTakeover = (vault: EmergencyAccessContact) => {
    selectedContactForTakeover.set(vault)
    isTakeoverOpen.set(true)
  }

  const handleOpenEdit = (contact: EmergencyAccessContact) => {
    selectedContactForEdit.set(contact)
    isEditOpen.set(true)
  }

  return {
    currentTab: currentTab.get,
    setCurrentTab: currentTab.set,
    trustedContacts: trustedContacts.get,
    grantedVaults: grantedVaults.get,
    isLoading: isLoading.get,
    isActionRunning: isActionRunning.get,
    actionTargetId: actionTargetId.get,
    successMessage: successMessage.get,
    errorMessage: errorMessage.get,
    loadData,
    notifySuccess,
    notifyError,
    statusLabel,
    statusBadgeClass,
    // Dialog state
    isInviteOpen: isInviteOpen.get,
    openInvite: () => isInviteOpen.set(true),
    closeInvite: () => isInviteOpen.set(false),
    isEditOpen: isEditOpen.get,
    selectedContactForEdit: selectedContactForEdit.get,
    closeEdit: () => {
      isEditOpen.set(false)
      selectedContactForEdit.set(null)
    },
    isVaultViewOpen: isVaultViewOpen.get,
    selectedContactForVaultView: selectedContactForVaultView.get,
    closeVaultView: () => {
      isVaultViewOpen.set(false)
      selectedContactForVaultView.set(null)
    },
    isTakeoverOpen: isTakeoverOpen.get,
    selectedContactForTakeover: selectedContactForTakeover.get,
    closeTakeover: () => {
      isTakeoverOpen.set(false)
      selectedContactForTakeover.set(null)
    },
    // Grantor handlers
    handleConfirmContact,
    handleReinviteContact,
    handleApproveRecovery,
    handleRejectRecovery,
    handleDeleteContact,
    handleOpenEdit,
    // Grantee handlers
    handleAcceptInvite,
    handleInitiateAccess,
    handleOpenVaultView,
    handleOpenTakeover,
    handleBackToVault: props.onNavigateToVault,
  }
}
