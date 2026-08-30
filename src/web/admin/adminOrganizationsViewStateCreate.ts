import type { AdminShellState } from "./AdminShellState.js"

export function adminOrganizationsViewStateCreate(state: AdminShellState) {
  const search = (event: Event & { currentTarget: HTMLInputElement }) => state.setSearchQuery(event.currentTarget.value)
  const open = (id: string) => () => {
    state.selectOrganization(id)
    state.openDialog({ kind: "organizationDetails", entityId: id })
  }
  const reloadOrganizations = () => {
    state.organizationsReload()
    state.showFeedback({ kind: "success", message: "Organizations reloaded from the demo directory." })
  }

  return { search, open, reloadOrganizations }
}
