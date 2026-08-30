import type { AdminShellState } from "./AdminShellState.js"

export function adminUsersViewStateCreate(state: AdminShellState) {
  const search = (event: Event & { currentTarget: HTMLInputElement }) => state.setSearchQuery(event.currentTarget.value)
  const invite = () => state.openDialog({ kind: "inviteUser", entityId: null })
  const open = (id: string) => () => {
    state.selectUser(id)
    state.openDialog({ kind: "userDetails", entityId: id })
  }
  const editOrganizationRole = (userId: string, organizationId: string) => () => {
    state.openUserOrganizationRole(userId, organizationId)
  }
  const reloadUsers = () => {
    state.usersReload()
    state.showFeedback({ kind: "success", message: "Users reloaded from the demo directory." })
  }
  const forceClientResync = () => {
    state.clientsForceResync()
    state.showFeedback({ kind: "success", message: "Clients will resync the next time they connect." })
  }

  return { search, invite, open, editOrganizationRole, reloadUsers, forceClientResync }
}
