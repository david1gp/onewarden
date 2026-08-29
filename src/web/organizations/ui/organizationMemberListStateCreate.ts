import { type Accessor, createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import { organizationMemberRoleLabelResolve } from "../api/organizationMemberRoleLabelResolve.js"
import { organizationMemberStatusLabelResolve } from "../api/organizationMemberStatusLabelResolve.js"

export interface OrganizationMemberListProps {
  members: Accessor<OrganizationMember[]>
  onInviteClick: () => void
  onSelectMember: (memberId: string) => void
  selectedMemberId: Accessor<string | null>
}

export function organizationMemberListStateCreate(props: OrganizationMemberListProps) {
  const searchQuerySignal = createSignalObject("")

  const filteredMembers = createMemo(() => {
    const query = searchQuerySignal.get().toLowerCase().trim()
    const all = props.members()
    if (!query) return all
    return all.filter(
      (m) =>
        m.email.toLowerCase().includes(query) ||
        (m.name?.toLowerCase().includes(query) ?? false) ||
        organizationMemberRoleLabelResolve(m.type).toLowerCase().includes(query),
    )
  })

  const handleSearchChange = (value: string) => {
    searchQuerySignal.set(value)
  }

  const isSelected = (memberId: string) => props.selectedMemberId() === memberId

  const handleMemberClick = (memberId: string) => {
    props.onSelectMember(memberId)
  }

  const resolveMemberRole = (role: number) => organizationMemberRoleLabelResolve(role)

  const resolveMemberStatus = (status: number) => organizationMemberStatusLabelResolve(status)

  return {
    filteredMembers,
    handleMemberClick,
    handleSearchChange,
    isSelected,
    onInviteClick: props.onInviteClick,
    resolveMemberRole,
    resolveMemberStatus,
    searchQuery: searchQuerySignal.get,
  }
}
