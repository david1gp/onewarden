import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationCollectionInput } from "../organizations/schemas/organizationCollectionInputSchema.js"
import type { OrganizationCollection } from "../organizations/schemas/organizationCollectionSchema.js"
import type { OrganizationMember } from "../organizations/schemas/organizationMemberSchema.js"
import type { AdminShellState } from "./AdminShellState.js"
import type { AdminUserOrganizationRole } from "./adminUserOrganizationRoleSchema.js"
import type { AdminUser } from "./adminUserSchema.js"

const adminMemberTypeByRole: Record<AdminUserOrganizationRole, number> = {
  owner: 0,
  admin: 1,
  user: 2,
  manager: 3,
}

const adminMemberStatusByUserStatus: Record<AdminUser["status"], number> = {
  active: 2,
  disabled: -1,
  invited: 0,
}

export function adminCollectionsPanelStateCreate(state: AdminShellState) {
  const collectionState = state.collectionState
  const mobilePane = createSignalObject<"list" | "detail">("list")
  const createOpen = createSignalObject(false)
  const editOpen = createSignalObject(false)
  const editingCollection = createSignalObject<OrganizationCollection | null>(null)

  const members = createMemo<OrganizationMember[]>(() => {
    const organizationId = collectionState.selectedOrganization()?.id
    if (!organizationId) return []
    return state.users().flatMap((user) => {
      const membership = (user.organizations ?? []).find((organization) => organization.id === organizationId)
      if (!membership) return []
      return [
        {
          accessAll: membership.role === "owner" || membership.role === "admin",
          email: user.email,
          id: user.id,
          name: user.name,
          status: adminMemberStatusByUserStatus[user.status],
          twoFactorEnabled: user.twoFactorEnabled,
          type: adminMemberTypeByRole[membership.role],
          userId: user.id,
        } satisfies OrganizationMember,
      ]
    })
  })

  const collections = createMemo(() => [...collectionState.collections()])

  const selectOrganization = (organizationId: string) => () => {
    const result = collectionState.selectOrganization(organizationId)
    if (!result.success) {
      state.showFeedback({ kind: "error", message: result.errorMessage })
      return
    }
    mobilePane.set("list")
  }

  const isSelectedOrganization = (organizationId: string) =>
    collectionState.selectedOrganization()?.id === organizationId

  const selectCollection = (collectionId: string) => {
    const result = collectionState.selectCollection(collectionId)
    if (!result.success) {
      state.showFeedback({ kind: "error", message: result.errorMessage })
      return
    }
    mobilePane.set("detail")
  }

  const showList = () => mobilePane.set("list")

  const openCreate = () => {
    createOpen.set(true)
  }

  const closeCreate = () => {
    createOpen.set(false)
  }

  const openEdit = (collection: OrganizationCollection) => {
    editingCollection.set(collection)
    editOpen.set(true)
  }

  const closeEdit = () => {
    editOpen.set(false)
    editingCollection.set(null)
  }

  const createCollection = async (input: OrganizationCollectionInput) => {
    const result = collectionState.createCollection(input)
    if (!result.success) {
      state.showFeedback({ kind: "error", message: result.errorMessage })
      return false
    }
    mobilePane.set("detail")
    state.showFeedback({ kind: "success", message: `Collection ${result.data.name} created in demo state.` })
    return true
  }

  const saveCollection = async (collectionId: string, input: OrganizationCollectionInput) => {
    const result = collectionState.updateCollection(collectionId, input)
    if (!result.success) {
      state.showFeedback({ kind: "error", message: result.errorMessage })
      return false
    }
    state.showFeedback({ kind: "success", message: `Collection ${result.data.name} updated in demo state.` })
    return true
  }

  const deleteCollection = async (collectionId: string) => {
    const collection = collectionState.collections().find((candidate) => candidate.id === collectionId)
    const result = collectionState.deleteCollection(collectionId)
    if (!result.success) {
      state.showFeedback({ kind: "error", message: result.errorMessage })
      return
    }
    mobilePane.set("list")
    state.showFeedback({
      kind: "success",
      message: `Collection ${collection?.name ?? collectionId} deleted in demo state.`,
    })
  }

  return {
    collections,
    createCollection,
    closeCreate,
    closeEdit,
    deleteCollection,
    editingCollection: editingCollection.get,
    isEditOpen: editOpen.get,
    isCreateOpen: createOpen.get,
    isSelectedOrganization,
    members,
    mobilePane: mobilePane.get,
    openCreate,
    openEdit,
    saveCollection,
    selectCollection,
    selectedCollection: collectionState.selectedCollection,
    selectedCollectionId: collectionState.selectedCollectionId,
    selectedOrganization: collectionState.selectedOrganization,
    selectOrganization,
    showList,
  }
}
