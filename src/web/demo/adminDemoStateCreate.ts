import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminUserOrganizationRole } from "../admin/adminUserOrganizationRoleSchema.js"
import type { AdminConfirmation } from "../admin/adminConfirmationSchema.js"
import type { AdminDiagnostics } from "../admin/adminDiagnosticsSchema.js"
import type { AdminDialog } from "../admin/adminDialogSchema.js"
import type { AdminFeedback } from "../admin/adminFeedbackSchema.js"
import type { AdminOrganization } from "../admin/adminOrganizationSchema.js"
import type { AdminSearch } from "../admin/adminSearchSchema.js"
import type { AdminSection } from "../admin/adminSectionSchema.js"
import type { AdminSettings, AdminSettingsOverride } from "../admin/adminSettingsSchema.js"
import type { AdminUser } from "../admin/adminUserSchema.js"
import { adminDiagnosticsDemoData } from "./adminDiagnosticsDemoData.js"
import { adminOrganizationsDemoData } from "./adminOrganizationsDemoData.js"
import { adminSettingsDemoData } from "./adminSettingsDemoData.js"
import { adminUsersDemoData } from "./adminUsersDemoData.js"

type AdminDemoStateProps = {
  settings?: AdminSettings
  users?: readonly AdminUser[]
  organizations?: readonly AdminOrganization[]
  diagnostics?: AdminDiagnostics
}

const adminBooleanSettingKeys: readonly AdminSettingsOverride[] = [
  "signupsAllowed",
  "invitationsAllowed",
  "mailEnabled",
  "ssoEnabled",
  "twoFactorEnabled",
  "adminTokenDisabled",
]

const organizationRoleOptions: string[] = ["user", "manager", "admin", "owner"]
const organizationRoleLabels: Record<AdminUserOrganizationRole, string> = {
  user: "User",
  manager: "Manager",
  admin: "Admin",
  owner: "Owner",
}
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

function demoTimestampCreate() {
  return new Date().toISOString()
}

function adminDateTimeFormat(value: string | null | undefined) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateTimeFormatter.format(date)
}

function adminAttachmentSizeFormat(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export function adminDemoStateCreate(props: AdminDemoStateProps = {}) {
  const settings = createSignalObject(props.settings ?? adminSettingsDemoData)
  const defaultSettings: AdminSettings = { ...adminSettingsDemoData, overrides: [] }
  const users = createSignalObject<readonly AdminUser[]>(props.users ?? adminUsersDemoData)
  const organizations = createSignalObject<readonly AdminOrganization[]>(
    props.organizations ?? adminOrganizationsDemoData,
  )
  const diagnostics = createSignalObject(props.diagnostics ?? adminDiagnosticsDemoData)
  const activeSection = createSignalObject<AdminSection>("settings")
  const search = createSignalObject<AdminSearch>({ query: "", scope: "users" })
  const selectedUserId = createSignalObject<string | null>(null)
  const selectedUserOrganizationId = createSignalObject<string | null>(null)
  const organizationRole = createSignalObject<string>("user")
  const selectedOrganizationId = createSignalObject<string | null>(null)
  const dialog = createSignalObject<AdminDialog | null>(null)
  const confirmation = createSignalObject<AdminConfirmation | null>(null)
  const confirmationInput = createSignalObject("")
  const feedback = createSignalObject<AdminFeedback | null>(null)
  const lastUsersReloadedAt = createSignalObject<string | null>(null)
  const lastClientResyncAt = createSignalObject<string | null>(null)
  const lastOrganizationsReloadedAt = createSignalObject<string | null>(null)

  const filteredUsers = createMemo(() => {
    const query = search.get().query.trim().toLowerCase()
    if (query.length === 0) return users.get()
    return users.get().filter((user) => {
      const organizations = (user.organizations ?? []).map((organization) => organization.name).join(" ")
      return `${user.name} ${user.email} ${user.status} ${user.role} ${user.ssoIdentifier ?? ""} ${organizations}`
        .toLowerCase()
        .includes(query)
    })
  })

  const filteredOrganizations = createMemo(() => {
    const query = search.get().query.trim().toLowerCase()
    if (query.length === 0) return organizations.get()
    return organizations
      .get()
      .filter((organization) =>
        `${organization.name} ${organization.billingEmail} ${organization.uuid} ${organization.ownerName} ${organization.plan}`
          .toLowerCase()
          .includes(query),
      )
  })

  const selectedUser = createMemo(() => {
    const id = selectedUserId.get()
    return id === null ? null : (users.get().find((user) => user.id === id) ?? null)
  })

  const selectedUserOrganization = createMemo(() => {
    const organizationId = selectedUserOrganizationId.get()
    if (organizationId === null) return null
    return selectedUser()?.organizations?.find((organization) => organization.id === organizationId) ?? null
  })

  const selectedOrganization = createMemo(() => {
    const id = selectedOrganizationId.get()
    return id === null ? null : (organizations.get().find((organization) => organization.id === id) ?? null)
  })

  const selectSection = (section: AdminSection) => {
    activeSection.set(section)
    search.set({ query: "", scope: section === "organizations" ? "organizations" : "users" })
  }

  const setSearchQuery = (query: string) => {
    search.set({ ...search.get(), query })
  }

  const selectUser = (id: string | null) => {
    selectedUserId.set(id)
    selectedUserOrganizationId.set(null)
  }

  const selectUserOrganization = (id: string | null) => {
    selectedUserOrganizationId.set(id)
    if (id === null) return
    const organization = selectedUser()?.organizations?.find((membership) => membership.id === id)
    if (organization) organizationRole.set(organization.role)
  }

  const openUserOrganizationRole = (userId: string, organizationId: string) => {
    selectUser(userId)
    selectUserOrganization(organizationId)
    if (!selectedUserOrganization()) return
    dialog.set({ kind: "organizationRole", entityId: organizationId })
  }

  const selectOrganization = (id: string | null) => {
    selectedOrganizationId.set(id)
  }

  const openDialog = (value: AdminDialog) => {
    dialog.set(value)
  }

  const closeDialog = () => {
    dialog.set(null)
  }

  const requestConfirmation = (value: AdminConfirmation) => {
    confirmationInput.set("")
    confirmation.set(value)
  }

  const setConfirmationInput = (value: string) => {
    confirmationInput.set(value)
  }

  const closeConfirmation = () => {
    confirmationInput.set("")
    confirmation.set(null)
  }

  const showFeedback = (value: AdminFeedback) => {
    feedback.set(value)
  }

  const clearFeedback = () => {
    feedback.set(null)
  }

  const toggleSetting = (key: AdminSettingsOverride) => {
    if (!adminBooleanSettingKeys.includes(key)) return
    const currentSettings = settings.get()
    const nextSettings = { ...currentSettings, [key]: !currentSettings[key] }
    const overrides = currentSettings.overrides.includes(key)
      ? currentSettings.overrides
      : [...currentSettings.overrides, key]
    settings.set({ ...nextSettings, overrides })
  }

  const resetSettings = () => {
    settings.set({ ...defaultSettings })
  }

  const updateUser = (id: string, update: (user: AdminUser) => AdminUser) => {
    users.set(users.get().map((user) => (user.id === id ? update(user) : user)))
  }

  const userRemove2fa = (userId: string) => {
    updateUser(userId, (user) => ({ ...user, twoFactorEnabled: false }))
  }

  const userDeauthorizeSessions = (userId: string) => {
    const timestamp = demoTimestampCreate()
    updateUser(userId, (user) => ({ ...user, sessionsDeauthorizedAt: timestamp }))
  }

  const userRemoveSsoAssociation = (userId: string) => {
    updateUser(userId, (user) => ({ ...user, ssoIdentifier: null }))
  }

  const userSetStatus = (userId: string, status: AdminUser["status"]) => {
    updateUser(userId, (user) => ({ ...user, status }))
  }

  const userResendInvitation = (userId: string) => {
    const timestamp = demoTimestampCreate()
    updateUser(userId, (user) => ({ ...user, invitationSentAt: timestamp }))
  }

  const userDelete = (userId: string) => {
    users.set(users.get().filter((user) => user.id !== userId))
    if (selectedUserId.get() !== userId) return
    selectedUserId.set(null)
    selectedUserOrganizationId.set(null)
    dialog.set(null)
  }

  const userOrganizationRoleSet = (userId: string, organizationId: string, role: AdminUserOrganizationRole) => {
    updateUser(userId, (user) => {
      const organizations = user.organizations ?? []
      if (!organizations.some((organization) => organization.id === organizationId)) return user
      return {
        ...user,
        organizations: organizations.map((organization) =>
          organization.id === organizationId ? { ...organization, role } : organization,
        ),
      }
    })
    organizationRole.set(role)
  }

  const usersReload = () => {
    users.set([...users.get()])
    lastUsersReloadedAt.set(demoTimestampCreate())
  }

  const clientsForceResync = () => {
    lastClientResyncAt.set(demoTimestampCreate())
  }

  const organizationSetStatus = (organizationId: string, status: AdminOrganization["status"]) => {
    organizations.set(
      organizations
        .get()
        .map((organization) => (organization.id === organizationId ? { ...organization, status } : organization)),
    )
  }

  const organizationDelete = (organizationId: string) => {
    organizations.set(organizations.get().filter((organization) => organization.id !== organizationId))
    users.set(
      users.get().map((user) => {
        const memberships = user.organizations ?? []
        const nextMemberships = memberships.filter((organization) => organization.id !== organizationId)
        if (nextMemberships.length === memberships.length) return user
        return { ...user, organizationCount: nextMemberships.length, organizations: nextMemberships }
      }),
    )
    if (selectedOrganizationId.get() !== organizationId) return
    selectedOrganizationId.set(null)
    dialog.set(null)
  }

  const organizationsReload = () => {
    organizations.set([...organizations.get()])
    lastOrganizationsReloadedAt.set(demoTimestampCreate())
  }

  return {
    settings: settings.get,
    users: users.get,
    organizations: organizations.get,
    diagnostics: diagnostics.get,
    activeSection: activeSection.get,
    search: search.get,
    filteredUsers,
    filteredOrganizations,
    selectedUser,
    selectedUserOrganization,
    selectedOrganization,
    selectedUserId: selectedUserId.get,
    selectedOrganizationId: selectedOrganizationId.get,
    confirmationInput,
    organizationRole,
    organizationRoleOptions,
    organizationRoleLabel: (role: string) => organizationRoleLabels[role as AdminUserOrganizationRole] ?? role,
    lastUsersReloadedAt: lastUsersReloadedAt.get,
    lastClientResyncAt: lastClientResyncAt.get,
    lastOrganizationsReloadedAt: lastOrganizationsReloadedAt.get,
    dialog: dialog.get,
    confirmation: confirmation.get,
    feedback: feedback.get,
    selectSection,
    setSearchQuery,
    selectUser,
    selectUserOrganization,
    openUserOrganizationRole,
    selectOrganization,
    openDialog,
    closeDialog,
    requestConfirmation,
    setConfirmationInput,
    closeConfirmation,
    showFeedback,
    clearFeedback,
    toggleSetting,
    resetSettings,
    userRemove2fa,
    userDeauthorizeSessions,
    userRemoveSsoAssociation,
    userSetStatus,
    userResendInvitation,
    userDelete,
    userOrganizationRoleSet,
    usersReload,
    clientsForceResync,
    organizationSetStatus,
    organizationDelete,
    organizationsReload,
    formatDateTime: adminDateTimeFormat,
    formatAttachmentSize: adminAttachmentSizeFormat,
  }
}
