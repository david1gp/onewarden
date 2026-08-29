import type { AdminShellState } from "./AdminShellState.js"

export function adminUsersViewStateCreate(state: AdminShellState) {
  const search = (event: Event & { currentTarget: HTMLInputElement }) => state.setSearchQuery(event.currentTarget.value)
  const invite = () => state.openDialog({ kind: "inviteUser", entityId: null })
  const open = (id: string) => () => {
    state.selectUser(id)
    state.openDialog({ kind: "userDetails", entityId: id })
  }

  return { search, invite, open }
}
