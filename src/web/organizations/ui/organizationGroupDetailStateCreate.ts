import { createMemo, type Accessor } from "solid-js"
import type { OrganizationGroup } from "../schemas/organizationGroupSchema.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"

export interface OrganizationGroupDetailProps {
  collections: Accessor<OrganizationCollection[]>
  group: Accessor<OrganizationGroup | null>
  members: Accessor<OrganizationMember[]>
  onBack?: () => void
  onDelete: (groupId: string) => void
  onEdit: (group: OrganizationGroup) => void
  onRemoveMember?: (groupId: string, memberId: string) => void
}

export function organizationGroupDetailStateCreate(props: OrganizationGroupDetailProps) {
  const group = () => props.group()

  const assignedMembers = createMemo(() => {
    const currentGroup = group()
    if (!currentGroup?.users) return []
    const allMembers = props.members()
    return currentGroup.users.map((userIdOrMemberId) => {
      const match = allMembers.find((m) => m.id === userIdOrMemberId || m.userId === userIdOrMemberId)
      return {
        email: match?.email ?? "",
        id: userIdOrMemberId,
        memberId: match?.id ?? userIdOrMemberId,
        name: match?.name ?? match?.email ?? userIdOrMemberId,
      }
    })
  })

  const assignedCollections = createMemo(() => {
    const currentGroup = group()
    if (!currentGroup?.collections) return []
    const allCollections = props.collections()
    return currentGroup.collections.map((colAccess) => {
      const match = allCollections.find((c) => c.id === colAccess.id)
      return {
        hidePasswords: colAccess.hidePasswords,
        id: colAccess.id,
        manage: colAccess.manage,
        name: match?.name ?? colAccess.name ?? colAccess.id,
        readOnly: colAccess.readOnly,
      }
    })
  })

  const handleEditClick = () => {
    const currentGroup = group()
    if (currentGroup) {
      props.onEdit(currentGroup)
    }
  }

  const handleBackClick = () => props.onBack?.()

  const handleDeleteClick = () => {
    const currentGroup = group()
    if (currentGroup && confirm(`Are you sure you want to delete group "${currentGroup.name}"?`)) {
      props.onDelete(currentGroup.id)
    }
  }

  const handleRemoveMember = (memberId: string) => {
    const currentGroup = group()
    if (currentGroup && props.onRemoveMember) {
      props.onRemoveMember(currentGroup.id, memberId)
    }
  }

  return {
    assignedCollections,
    assignedMembers,
    group,
    handleBackClick,
    handleDeleteClick,
    handleEditClick,
    handleRemoveMember,
    hasBack: () => Boolean(props.onBack),
  }
}
