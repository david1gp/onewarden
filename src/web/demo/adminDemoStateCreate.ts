import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
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
  const selectedOrganizationId = createSignalObject<string | null>(null)
  const dialog = createSignalObject<AdminDialog | null>(null)
  const confirmation = createSignalObject<AdminConfirmation | null>(null)
  const feedback = createSignalObject<AdminFeedback | null>(null)

  const filteredUsers = createMemo(() => {
    const query = search.get().query.trim().toLowerCase()
    if (query.length === 0) return users.get()
    return users
      .get()
      .filter((user) => `${user.name} ${user.email} ${user.status} ${user.role}`.toLowerCase().includes(query))
  })

  const filteredOrganizations = createMemo(() => {
    const query = search.get().query.trim().toLowerCase()
    if (query.length === 0) return organizations.get()
    return organizations
      .get()
      .filter((organization) =>
        `${organization.name} ${organization.ownerName} ${organization.plan}`.toLowerCase().includes(query),
      )
  })

  const selectedUser = createMemo(() => {
    const id = selectedUserId.get()
    return id === null ? null : (users.get().find((user) => user.id === id) ?? null)
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
    confirmation.set(value)
  }

  const closeConfirmation = () => {
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
    selectedOrganization,
    selectedUserId: selectedUserId.get,
    selectedOrganizationId: selectedOrganizationId.get,
    dialog: dialog.get,
    confirmation: confirmation.get,
    feedback: feedback.get,
    selectSection,
    setSearchQuery,
    selectUser,
    selectOrganization,
    openDialog,
    closeDialog,
    requestConfirmation,
    closeConfirmation,
    showFeedback,
    clearFeedback,
    toggleSetting,
    resetSettings,
  }
}
