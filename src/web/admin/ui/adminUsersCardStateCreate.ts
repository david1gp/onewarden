import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminUser } from "../model/adminUserSchema.js"
import { webAdminApiClientCreate } from "../model/webAdminApiClientCreate.js"

export interface AdminUsersCardProps {
  apiClient?: ReturnType<typeof webAdminApiClientCreate>
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function adminUsersCardStateCreate(props: AdminUsersCardProps) {
  const apiClient = props.apiClient ?? webAdminApiClientCreate()

  const users = createSignalObject<AdminUser[]>([])
  const isLoading = createSignalObject(false)
  const isActionRunning = createSignalObject(false)
  const actionTargetId = createSignalObject<string | null>(null)
  const searchQuery = createSignalObject("")

  // Invite modal
  const isInviteOpen = createSignalObject(false)
  const inviteEmail = createSignalObject("")
  const isInviting = createSignalObject(false)

  const loadUsers = async () => {
    isLoading.set(true)
    const result = await apiClient.usersList()
    isLoading.set(false)
    if (result.success) {
      users.set(result.data)
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  onMount(() => {
    loadUsers()
  })

  const filteredUsers = () => {
    const q = searchQuery.get().toLowerCase().trim()
    if (!q) return users.get()
    return users.get().filter((u) => u.email.toLowerCase().includes(q) || (u.name?.toLowerCase().includes(q) ?? false))
  }

  const handleInviteUser = async (e: Event) => {
    e.preventDefault()
    const email = inviteEmail.get().trim().toLowerCase()
    if (!email) return

    isInviting.set(true)
    const result = await apiClient.userInvite(email)
    isInviting.set(false)

    if (result.success) {
      props.onNotifySuccess?.(`User ${email} invited successfully.`)
      inviteEmail.set("")
      isInviteOpen.set(false)
      loadUsers()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleDeauthUser = async (user: AdminUser) => {
    isActionRunning.set(true)
    actionTargetId.set(user.id)
    const result = await apiClient.userDeauth(user.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      props.onNotifySuccess?.(`Deauthorized all sessions for ${user.email}.`)
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleToggleUserStatus = async (user: AdminUser) => {
    isActionRunning.set(true)
    actionTargetId.set(user.id)
    const result = user.userEnabled ? await apiClient.userDisable(user.id) : await apiClient.userEnable(user.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      props.onNotifySuccess?.(`User ${user.email} ${user.userEnabled ? "disabled" : "enabled"} successfully.`)
      loadUsers()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleRemove2fa = async (user: AdminUser) => {
    isActionRunning.set(true)
    actionTargetId.set(user.id)
    const result = await apiClient.userRemove2fa(user.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      props.onNotifySuccess?.(`Two-factor authentication removed for ${user.email}.`)
      loadUsers()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleResendInvite = async (user: AdminUser) => {
    isActionRunning.set(true)
    actionTargetId.set(user.id)
    const result = await apiClient.userResendInvite(user.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      props.onNotifySuccess?.(`Invitation resent to ${user.email}.`)
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.email}? This cannot be undone.`)) {
      return
    }
    isActionRunning.set(true)
    actionTargetId.set(user.id)
    const result = await apiClient.userDelete(user.id)
    isActionRunning.set(false)
    actionTargetId.set(null)
    if (result.success) {
      props.onNotifySuccess?.(`User ${user.email} deleted permanently.`)
      loadUsers()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    users: filteredUsers,
    totalCount: () => users.get().length,
    isLoading: isLoading.get,
    isActionRunning: isActionRunning.get,
    actionTargetId: actionTargetId.get,
    searchQuery: searchQuery.get,
    setSearchQuery: searchQuery.set,
    isInviteOpen: isInviteOpen.get,
    openInvite: () => isInviteOpen.set(true),
    closeInvite: () => isInviteOpen.set(false),
    inviteEmail: inviteEmail.get,
    setInviteEmail: inviteEmail.set,
    isInviting: isInviting.get,
    loadUsers,
    handleInviteUser,
    handleDeauthUser,
    handleToggleUserStatus,
    handleRemove2fa,
    handleResendInvite,
    handleDeleteUser,
  }
}
