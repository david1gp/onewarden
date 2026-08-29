import type { ButtonVariant } from "#ui/interactive/button/buttonCva.js"
import type { AdminSection } from "./adminSectionSchema.js"
import type { AdminShellState } from "./AdminShellState.js"

const sections: readonly { id: AdminSection; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "users", label: "Users" },
  { id: "organizations", label: "Organizations" },
  { id: "diagnostics", label: "Diagnostics" },
]

export function adminShellStateCreate(state: AdminShellState) {
  const selectSection = (section: AdminSection) => () => state.selectSection(section)
  const sectionVariant = (section: AdminSection): ButtonVariant =>
    state.activeSection() === section ? "filledBlue" : "ghost"
  const invite = (event: SubmitEvent) => {
    event.preventDefault()
    state.closeDialog()
    state.showFeedback({ kind: "success", message: "Invitation queued for the demo user." })
  }
  const disableUser = () => {
    const user = state.selectedUser()
    if (!user) return
    state.closeDialog()
    state.requestConfirmation({
      action: "disableUser",
      entityId: user.id,
      title: `Disable ${user.name}?`,
      message: "The user will no longer be able to sign in.",
    })
  }
  const deleteUser = () => {
    const user = state.selectedUser()
    if (!user) return
    state.closeDialog()
    state.requestConfirmation({
      action: "deleteUser",
      entityId: user.id,
      title: `Delete ${user.name}?`,
      message: "This destructive action cannot be undone.",
    })
  }
  const disableOrganization = () => {
    const organization = state.selectedOrganization()
    if (!organization) return
    state.closeDialog()
    state.requestConfirmation({
      action: "disableOrganization",
      entityId: organization.id,
      title: `Disable ${organization.name}?`,
      message: "Members will lose access to this organization.",
    })
  }
  const confirm = () => {
    const confirmation = state.confirmation()
    if (!confirmation) return
    if (confirmation.action === "resetSettings") state.resetSettings()
    state.closeConfirmation()
    state.showFeedback({ kind: "success", message: `${confirmation.title.replace("?", "")} Demo state confirmed.` })
  }
  const dialogTitle = () => {
    const kind = state.dialog()?.kind
    if (kind === "inviteUser") return "Invite user"
    if (kind === "userDetails") return "User details"
    if (kind === "organizationDetails") return "Organization details"
    return "Settings"
  }
  const twoFactorLabel = (enabled: boolean) => (enabled ? "enabled" : "disabled")
  const requirementLabel = (enabled: boolean) => (enabled ? "Yes" : "No")
  const availabilityLabel = (enabled: boolean) => (enabled ? "Enabled" : "Disabled")

  return {
    sections,
    selectSection,
    sectionVariant,
    invite,
    disableUser,
    deleteUser,
    disableOrganization,
    confirm,
    dialogTitle,
    twoFactorLabel,
    requirementLabel,
    availabilityLabel,
  }
}
