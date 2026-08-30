import * as v from "valibot"
import type { ButtonVariant } from "#ui/interactive/button/buttonCva.js"
import { vaultSvgIcons } from "../demo/vaultSvgIcons.js"
import type { AdminShellState } from "./AdminShellState.js"
import type { AdminSection } from "./adminSectionSchema.js"
import { adminUserOrganizationRoleSchema } from "./adminUserOrganizationRoleSchema.js"

const sections: readonly { id: AdminSection; label: string; icon: string }[] = [
  { id: "settings", label: "Settings", icon: vaultSvgIcons.cog },
  { id: "users", label: "Users", icon: vaultSvgIcons.users },
  { id: "organizations", label: "Organizations", icon: vaultSvgIcons.workVault },
  { id: "diagnostics", label: "Diagnostics", icon: vaultSvgIcons.shieldCheck },
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
      message: "The user will no longer be able to sign in and their sessions will be revoked.",
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
  const remove2fa = () => {
    const user = state.selectedUser()
    if (!user?.twoFactorEnabled) return
    state.closeDialog()
    state.requestConfirmation({
      action: "remove2fa",
      entityId: user.id,
      title: `Remove all 2FA for ${user.name}?`,
      message: "The user will need to set up two-factor authentication again.",
    })
  }
  const deauthorizeSessions = () => {
    const user = state.selectedUser()
    if (!user) return
    state.closeDialog()
    state.requestConfirmation({
      action: "deauthorizeSessions",
      entityId: user.id,
      title: `Deauthorize sessions for ${user.name}?`,
      message: "All active sessions for this user will be revoked.",
    })
  }
  const removeSsoAssociation = () => {
    const user = state.selectedUser()
    if (!user?.ssoIdentifier) return
    state.closeDialog()
    state.requestConfirmation({
      action: "removeSsoAssociation",
      entityId: user.id,
      title: `Remove SSO association for ${user.name}?`,
      message: "The user will no longer be linked to this SSO identity.",
    })
  }
  const toggleUserStatus = () => {
    const user = state.selectedUser()
    if (!user) return
    const isDisabled = user.status === "disabled"
    state.closeDialog()
    state.requestConfirmation({
      action: isDisabled ? "enableUser" : "disableUser",
      entityId: user.id,
      title: `${isDisabled ? "Enable" : "Disable"} ${user.name}?`,
      message: isDisabled
        ? "The user will be able to sign in again."
        : "The user will no longer be able to sign in and their sessions will be revoked.",
    })
  }
  const resendInvitation = () => {
    const user = state.selectedUser()
    if (user?.status !== "invited") return
    state.closeDialog()
    state.requestConfirmation({
      action: "resendInvitation",
      entityId: user.id,
      title: `Resend invitation for ${user.name}?`,
      message: "A new invitation email will be queued for this user.",
    })
  }
  const toggleOrganizationStatus = () => {
    const organization = state.selectedOrganization()
    if (!organization) return
    const isDisabled = organization.status === "disabled"
    state.closeDialog()
    state.requestConfirmation({
      action: isDisabled ? "enableOrganization" : "disableOrganization",
      entityId: organization.id,
      title: `${isDisabled ? "Enable" : "Disable"} ${organization.name}?`,
      message: isDisabled
        ? "Members will be able to access this organization again."
        : "Members will lose access to this organization.",
    })
  }
  const deleteOrganization = () => {
    const organization = state.selectedOrganization()
    if (!organization) return
    state.closeDialog()
    state.requestConfirmation({
      action: "deleteOrganization",
      entityId: organization.id,
      title: `Delete ${organization.name}?`,
      message: `All organization data will be lost. Type the organization UUID exactly to confirm: ${organization.uuid}`,
      requiredInput: organization.uuid,
    })
  }
  const confirm = () => {
    const confirmation = state.confirmation()
    if (!confirmation) return
    if (confirmation.requiredInput !== undefined && state.confirmationInput.get() !== confirmation.requiredInput) {
      state.showFeedback({ kind: "error", message: "The organization UUID does not match." })
      return
    }
    if (confirmation.action === "resetSettings") state.resetSettings()
    if (confirmation.entityId !== null) {
      if (confirmation.action === "remove2fa") state.userRemove2fa(confirmation.entityId)
      if (confirmation.action === "deauthorizeSessions") state.userDeauthorizeSessions(confirmation.entityId)
      if (confirmation.action === "disableUser") {
        state.userSetStatus(confirmation.entityId, "disabled")
        state.userDeauthorizeSessions(confirmation.entityId)
      }
      if (confirmation.action === "enableUser") state.userSetStatus(confirmation.entityId, "active")
      if (confirmation.action === "deleteUser") state.userDelete(confirmation.entityId)
      if (confirmation.action === "removeSsoAssociation") state.userRemoveSsoAssociation(confirmation.entityId)
      if (confirmation.action === "resendInvitation") state.userResendInvitation(confirmation.entityId)
      if (confirmation.action === "disableOrganization") state.organizationSetStatus(confirmation.entityId, "disabled")
      if (confirmation.action === "enableOrganization") state.organizationSetStatus(confirmation.entityId, "active")
      if (confirmation.action === "deleteOrganization") state.organizationDelete(confirmation.entityId)
    }
    state.closeConfirmation()
    state.showFeedback({ kind: "success", message: `${confirmation.title.replace("?", "")} Demo state confirmed.` })
  }
  const saveOrganizationRole = (event: SubmitEvent) => {
    event.preventDefault()
    const user = state.selectedUser()
    const organization = state.selectedUserOrganization()
    if (!user || !organization) return
    const roleResult = v.safeParse(adminUserOrganizationRoleSchema, state.organizationRole.get())
    if (!roleResult.success) return
    state.userOrganizationRoleSet(user.id, organization.id, roleResult.output)
    state.closeDialog()
    state.showFeedback({ kind: "success", message: `Updated ${user.email}'s role in ${organization.name}.` })
  }
  const dialogTitle = () => {
    const kind = state.dialog()?.kind
    if (kind === "inviteUser") return "Invite user"
    if (kind === "userDetails") return "User details"
    if (kind === "organizationDetails") return "Organization details"
    if (kind === "organizationRole") return "Update organization role"
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
    remove2fa,
    deauthorizeSessions,
    removeSsoAssociation,
    toggleUserStatus,
    resendInvitation,
    disableUser,
    deleteUser,
    toggleOrganizationStatus,
    disableOrganization: toggleOrganizationStatus,
    deleteOrganization,
    confirmationInput: (event: Event & { currentTarget: HTMLInputElement }) =>
      state.setConfirmationInput(event.currentTarget.value),
    confirm,
    saveOrganizationRole,
    dialogTitle,
    twoFactorLabel,
    requirementLabel,
    availabilityLabel,
  }
}
