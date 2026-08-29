import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { EmergencyAccessContact } from "../model/emergencyAccessSchema.js"
import { webEmergencyAccessApiClientCreate } from "../model/webEmergencyAccessApiClientCreate.js"

export interface EmergencyAccessCardProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webEmergencyAccessApiClientCreate>
  onNotifySuccess?: (message: string) => void
  onNotifyError?: (message: string) => void
}

export function emergencyAccessCardStateCreate(props: EmergencyAccessCardProps) {
  const apiClient = props.apiClient ?? webEmergencyAccessApiClientCreate()

  const trustedContacts = createSignalObject<EmergencyAccessContact[]>([])
  const grantedVaults = createSignalObject<EmergencyAccessContact[]>([])
  const isLoading = createSignalObject(false)
  const isActionRunning = createSignalObject(false)

  // Dialog states
  const isInviteOpen = createSignalObject(false)
  const isEditOpen = createSignalObject(false)
  const selectedContactForEdit = createSignalObject<EmergencyAccessContact | null>(null)
  const isVaultViewOpen = createSignalObject(false)
  const selectedContactForVaultView = createSignalObject<EmergencyAccessContact | null>(null)
  const isTakeoverOpen = createSignalObject(false)
  const selectedContactForTakeover = createSignalObject<EmergencyAccessContact | null>(null)

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
      props.onNotifyError?.(trustedRes.errorMessage)
    }

    if (grantedRes.success) {
      grantedVaults.set(grantedRes.data)
    } else {
      props.onNotifyError?.(grantedRes.errorMessage)
    }
  }

  onMount(() => {
    loadData()
  })

  const handleConfirmContact = async (contact: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    const key = sessionData.encryptedUserKey ?? "confirmed-emergency-key"
    const result = await apiClient.confirm(sessionData.accessToken, contact.id, key)
    isActionRunning.set(false)
    if (result.success) {
      props.onNotifySuccess?.(`Confirmed emergency access for ${contact.email}.`)
      loadData()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleDeleteContact = async (contact: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    const result = await apiClient.deleteAccess(sessionData.accessToken, contact.id)
    isActionRunning.set(false)
    if (result.success) {
      props.onNotifySuccess?.(`Removed emergency contact ${contact.email}.`)
      loadData()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleAcceptInvite = async (vault: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    const token = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("token")
    if (!token) {
      props.onNotifyError?.("Open the emergency access invitation link from your email to accept this invitation.")
      return
    }
    isActionRunning.set(true)
    const result = await apiClient.accept(sessionData.accessToken, vault.id, token)
    isActionRunning.set(false)
    if (result.success) {
      props.onNotifySuccess?.(`Accepted emergency invitation from ${vault.email}.`)
      loadData()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleInitiateAccess = async (vault: EmergencyAccessContact) => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isActionRunning.set(true)
    const result = await apiClient.initiate(sessionData.accessToken, vault.id)
    isActionRunning.set(false)
    if (result.success) {
      props.onNotifySuccess?.(`Emergency recovery initiated for ${vault.email}.`)
      loadData()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    trustedContacts: trustedContacts.get,
    grantedVaults: grantedVaults.get,
    isLoading: isLoading.get,
    isActionRunning: isActionRunning.get,
    loadData,
    isInviteOpen: isInviteOpen.get,
    openInvite: () => isInviteOpen.set(true),
    closeInvite: () => isInviteOpen.set(false),
    isEditOpen: isEditOpen.get,
    selectedContactForEdit: selectedContactForEdit.get,
    openEdit: (contact: EmergencyAccessContact) => {
      selectedContactForEdit.set(contact)
      isEditOpen.set(true)
    },
    closeEdit: () => {
      isEditOpen.set(false)
      selectedContactForEdit.set(null)
    },
    isVaultViewOpen: isVaultViewOpen.get,
    selectedContactForVaultView: selectedContactForVaultView.get,
    openVaultView: (vault: EmergencyAccessContact) => {
      selectedContactForVaultView.set(vault)
      isVaultViewOpen.set(true)
    },
    closeVaultView: () => {
      isVaultViewOpen.set(false)
      selectedContactForVaultView.set(null)
    },
    isTakeoverOpen: isTakeoverOpen.get,
    selectedContactForTakeover: selectedContactForTakeover.get,
    openTakeover: (vault: EmergencyAccessContact) => {
      selectedContactForTakeover.set(vault)
      isTakeoverOpen.set(true)
    },
    closeTakeover: () => {
      isTakeoverOpen.set(false)
      selectedContactForTakeover.set(null)
    },
    handleConfirmContact,
    handleDeleteContact,
    handleAcceptInvite,
    handleInitiateAccess,
  }
}
