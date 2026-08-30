import type { Accessor } from "solid-js"
import type { AdminConfirmation } from "./adminConfirmationSchema.js"
import type { AdminDiagnostics } from "./adminDiagnosticsSchema.js"
import type { AdminDialog } from "./adminDialogSchema.js"
import type { AdminFeedback } from "./adminFeedbackSchema.js"
import type { AdminOrganization } from "./adminOrganizationSchema.js"
import type { AdminSearch } from "./adminSearchSchema.js"
import type { AdminSection } from "./adminSectionSchema.js"
import type { AdminSettings, AdminSettingsOverride } from "./adminSettingsSchema.js"
import type { AdminUser } from "./adminUserSchema.js"
import type { AdminUserOrganizationMembership } from "./adminUserOrganizationMembershipSchema.js"
import type { AdminUserOrganizationRole } from "./adminUserOrganizationRoleSchema.js"
import type { SignalObject } from "#ui/utils/createSignalObject.js"

export interface AdminShellState {
  settings: Accessor<AdminSettings>
  users: Accessor<readonly AdminUser[]>
  diagnostics: Accessor<AdminDiagnostics>
  activeSection: Accessor<AdminSection>
  search: Accessor<AdminSearch>
  filteredUsers: Accessor<readonly AdminUser[]>
  filteredOrganizations: Accessor<readonly AdminOrganization[]>
  selectedUser: Accessor<AdminUser | null>
  selectedUserOrganization: Accessor<AdminUserOrganizationMembership | null>
  selectedOrganization: Accessor<AdminOrganization | null>
  confirmationInput: SignalObject<string>
  organizationRole: SignalObject<string>
  organizationRoleOptions: string[]
  organizationRoleLabel: (role: string) => string
  lastUsersReloadedAt: Accessor<string | null>
  lastClientResyncAt: Accessor<string | null>
  lastOrganizationsReloadedAt: Accessor<string | null>
  dialog: Accessor<AdminDialog | null>
  confirmation: Accessor<AdminConfirmation | null>
  feedback: Accessor<AdminFeedback | null>
  selectSection: (section: AdminSection) => void
  setSearchQuery: (query: string) => void
  selectUser: (id: string | null) => void
  selectUserOrganization: (id: string | null) => void
  openUserOrganizationRole: (userId: string, organizationId: string) => void
  selectOrganization: (id: string | null) => void
  openDialog: (dialog: AdminDialog) => void
  closeDialog: () => void
  requestConfirmation: (confirmation: AdminConfirmation) => void
  setConfirmationInput: (value: string) => void
  closeConfirmation: () => void
  showFeedback: (feedback: AdminFeedback) => void
  clearFeedback: () => void
  toggleSetting: (key: AdminSettingsOverride) => void
  resetSettings: () => void
  userRemove2fa: (userId: string) => void
  userDeauthorizeSessions: (userId: string) => void
  userRemoveSsoAssociation: (userId: string) => void
  userSetStatus: (userId: string, status: AdminUser["status"]) => void
  userResendInvitation: (userId: string) => void
  userDelete: (userId: string) => void
  userOrganizationRoleSet: (userId: string, organizationId: string, role: AdminUserOrganizationRole) => void
  usersReload: () => void
  clientsForceResync: () => void
  organizationSetStatus: (organizationId: string, status: AdminOrganization["status"]) => void
  organizationDelete: (organizationId: string) => void
  organizationsReload: () => void
  formatDateTime: (value: string | null | undefined) => string
  formatAttachmentSize: (bytes: number) => string
}
