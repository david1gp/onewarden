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

export interface AdminShellState {
  settings: Accessor<AdminSettings>
  diagnostics: Accessor<AdminDiagnostics>
  activeSection: Accessor<AdminSection>
  search: Accessor<AdminSearch>
  filteredUsers: Accessor<readonly AdminUser[]>
  filteredOrganizations: Accessor<readonly AdminOrganization[]>
  selectedUser: Accessor<AdminUser | null>
  selectedOrganization: Accessor<AdminOrganization | null>
  dialog: Accessor<AdminDialog | null>
  confirmation: Accessor<AdminConfirmation | null>
  feedback: Accessor<AdminFeedback | null>
  selectSection: (section: AdminSection) => void
  setSearchQuery: (query: string) => void
  selectUser: (id: string | null) => void
  selectOrganization: (id: string | null) => void
  openDialog: (dialog: AdminDialog) => void
  closeDialog: () => void
  requestConfirmation: (confirmation: AdminConfirmation) => void
  closeConfirmation: () => void
  showFeedback: (feedback: AdminFeedback) => void
  clearFeedback: () => void
  toggleSetting: (key: AdminSettingsOverride) => void
  resetSettings: () => void
}
